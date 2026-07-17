import { createHash } from 'node:crypto';
import { normalizeAgentId } from '@/lib/sites/agentConfig';
import {
  createDefaultLaunchKit,
  getLaunchKitSummary,
  normalizeLaunchKit,
  type AgentLaunchKit,
  type AgentLaunchKitResponse,
  type LaunchKitProvisioningAuditEvent,
} from '@/lib/sites/launchKit';
import { readExpiredPastDueSiteConfigs, readSiteConfig, saveSiteConfig } from '@/lib/sites/siteConfigStore';
import {
  notifyBuyerSiteBillingUpdate,
  notifyBuyerSiteGraceExpired,
  notifyBuyerSiteProvisioned,
  notifyOperatorSiteGraceExpired,
  notifyOperatorSiteBillingUpdate,
} from '@/lib/sites/siteLifecycleNotifications';

const PAST_DUE_GRACE_DAYS = 7;

export type PaidAgentSiteProvisioningInput = {
  agentId?: string | null;
  userId?: string | null;
  ownerName?: string | null;
  email?: string | null;
  subscriptionTier?: AgentLaunchKit['subscriptionTier'] | string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripeCheckoutSessionId?: string | null;
  trialEndsAt?: string | null;
  billingStatus?: AgentLaunchKit['billingProfile']['billingStatus'] | string | null;
  source?: string | null;
};

export type PaidAgentSiteProvisioningResult = AgentLaunchKitResponse & {
  created: boolean;
  savedStores: string[];
};

export type ExpirePastDueGracePeriodsResult = {
  scanned: number;
  expired: number;
  skipped: number;
  processed: Array<{
    agentId: string;
    status: 'expired' | 'skipped';
    reason?: string;
    siteStatus?: AgentLaunchKit['status'];
    savedStores?: string[];
  }>;
};

export async function provisionPaidAgentSite(
  input: PaidAgentSiteProvisioningInput,
): Promise<PaidAgentSiteProvisioningResult> {
  const agentId = resolveProvisionedAgentId(input);
  const existingRow = await readSiteConfig(agentId);
  const existing = Boolean(existingRow);
  const baseKit = existingRow
    ? normalizeLaunchKit(existingRow, agentId)
    : createDefaultLaunchKit(agentId);

  const email = normalizeEmail(input.email);
  const ownerName = existing
    ? baseKit.ownerName
    : normalizePersonName(input.ownerName) || deriveNameFromEmail(email) || baseKit.ownerName;
  const subscriptionTier = normalizeSubscriptionTier(input.subscriptionTier) || baseKit.subscriptionTier;
  const agentEmail = existing
    ? baseKit.agentProfile.email || email || undefined
    : email || baseKit.agentProfile.email;
  const leadEmail = existing
    ? baseKit.integrationProfile.leadEmail || email || undefined
    : email || baseKit.integrationProfile.leadEmail;

  const billingStatus = normalizeBillingStatus(input.billingStatus)
    || (existing ? baseKit.billingProfile.billingStatus : 'trialing')
    || 'trialing';
  const trialEndsAt = normalizeIsoDate(input.trialEndsAt) || baseKit.billingProfile.trialEndsAt || dateDaysFromNow(90);

  const kit = appendProvisioningAuditEvent(normalizeLaunchKit({
    ...baseKit,
    ownerId: baseKit.ownerId || input.userId || '',
    ownerName,
    status: baseKit.status === 'active' ? 'active' : 'draft',
    subscriptionTier,
    branding: {
      ...baseKit.branding,
      siteName: existing ? baseKit.branding.siteName : `${ownerName} Homes`,
    },
    hero: {
      ...baseKit.hero,
      title: existing ? baseKit.hero.title : `${ownerName}'s local home search`,
    },
    agentProfile: {
      ...baseKit.agentProfile,
      displayName: existing ? baseKit.agentProfile.displayName : ownerName,
      ...(agentEmail ? { email: agentEmail } : {}),
    },
    integrationProfile: {
      ...baseKit.integrationProfile,
      ...(leadEmail ? { leadEmail } : {}),
      crmTag: baseKit.integrationProfile.crmTag || 'stripe-provisioned-site',
    },
    billingProfile: {
      ...baseKit.billingProfile,
      userId: baseKit.billingProfile.userId || input.userId || '',
      stripeCustomerId: input.stripeCustomerId || baseKit.billingProfile.stripeCustomerId || '',
      stripeSubscriptionId: input.stripeSubscriptionId || baseKit.billingProfile.stripeSubscriptionId || '',
      stripeCheckoutSessionId: input.stripeCheckoutSessionId || baseKit.billingProfile.stripeCheckoutSessionId || '',
      trialEndsAt,
      billingStatus,
    },
    reviewProfile: existing ? baseKit.reviewProfile : {
      ...baseKit.reviewProfile,
      status: 'not_started',
    },
  }, agentId), {
    action: 'checkout.session.completed',
    source: input.source || 'stripe-webhook',
    status: 'succeeded',
    message: existing ? 'Stripe checkout refreshed an existing agent site.' : 'Stripe checkout provisioned a new draft agent site.',
    actor: 'stripe-webhook',
    stripeCheckoutSessionId: input.stripeCheckoutSessionId || '',
    stripeCustomerId: input.stripeCustomerId || '',
    stripeSubscriptionId: input.stripeSubscriptionId || '',
    billingStatus,
    siteStatus: existing && baseKit.status === 'active' ? 'active' : 'draft',
  });

  const savedStores = await saveSiteConfig(kit, {
    role: input.source || 'stripe-webhook',
    email,
    userId: input.userId,
  });

  if (!existing) {
    const emailResult = await notifyBuyerSiteProvisioned({
      kit,
      email,
      setupUrl: `/onboarding/site/setup?session_id=${encodeURIComponent(input.stripeCheckoutSessionId || '')}`,
    });
    if (emailResult.status === 'failed') {
      console.warn('[SITE_PROVISIONING_BUYER_EMAIL_FAILED]', emailResult.reason);
    }
  }

  return {
    ...getLaunchKitSummary(kit),
    created: !existing,
    savedStores,
  };
}

export async function suspendProvisionedAgentSite(input: PaidAgentSiteProvisioningInput) {
  const agentId = resolveProvisionedAgentId(input);
  const existingRow = await readSiteConfig(agentId);
  if (!existingRow) {
    return null;
  }

  const kit = normalizeLaunchKit(existingRow, agentId);
  const billingStatusChangedAt = new Date().toISOString();
  const suspendedKit = appendProvisioningAuditEvent(normalizeLaunchKit({
    ...kit,
    status: 'suspended',
    billingProfile: {
      ...kit.billingProfile,
      stripeCustomerId: input.stripeCustomerId || kit.billingProfile.stripeCustomerId || '',
      stripeSubscriptionId: input.stripeSubscriptionId || kit.billingProfile.stripeSubscriptionId || '',
      billingStatus: 'canceled',
      gracePeriodEndsAt: '',
      billingStatusChangedAt,
    },
  }, agentId), {
    action: 'customer.subscription.deleted',
    source: input.source || 'stripe-webhook',
    status: 'succeeded',
    message: 'Stripe subscription ended; agent site access was suspended.',
    actor: 'stripe-webhook',
    stripeCustomerId: input.stripeCustomerId || kit.billingProfile.stripeCustomerId || '',
    stripeSubscriptionId: input.stripeSubscriptionId || kit.billingProfile.stripeSubscriptionId || '',
    billingStatus: 'canceled',
    siteStatus: 'suspended',
  });
  const savedStores = await saveSiteConfig(suspendedKit, {
    role: input.source || 'stripe-webhook',
    email: normalizeEmail(input.email),
    userId: input.userId,
  });
  const summary = getLaunchKitSummary(suspendedKit);
  await notifyBillingStatusChange({
    kit: suspendedKit,
    email: input.email,
    status: 'canceled',
    previousStatus: kit.billingProfile.billingStatus,
    publicUrl: summary.publicUrl,
  });

  return {
    ...summary,
    savedStores,
  };
}

export async function updateProvisionedAgentSiteBilling(input: PaidAgentSiteProvisioningInput) {
  const agentId = resolveProvisionedAgentId(input);
  const existingRow = await readSiteConfig(agentId);
  if (!existingRow) {
    return null;
  }

  const kit = normalizeLaunchKit(existingRow, agentId);
  const billingStatus = normalizeBillingStatus(input.billingStatus) || kit.billingProfile.billingStatus || 'unknown';
  const trialEndsAt = normalizeIsoDate(input.trialEndsAt) || kit.billingProfile.trialEndsAt || '';
  const billingStatusChangedAt = billingStatus !== kit.billingProfile.billingStatus
    ? new Date().toISOString()
    : kit.billingProfile.billingStatusChangedAt || '';
  const gracePeriodEndsAt = resolveGracePeriodEndsAt(kit, billingStatus);
  const nextKitBase = normalizeLaunchKit({
    ...kit,
    billingProfile: {
      ...kit.billingProfile,
      stripeCustomerId: input.stripeCustomerId || kit.billingProfile.stripeCustomerId || '',
      stripeSubscriptionId: input.stripeSubscriptionId || kit.billingProfile.stripeSubscriptionId || '',
      trialEndsAt,
      gracePeriodEndsAt,
      billingStatusChangedAt,
      billingStatus,
    },
  }, agentId);
  const nextStatus = resolveSiteStatusForBilling(nextKitBase, billingStatus, kit);
  const nextKit = appendProvisioningAuditEvent(normalizeLaunchKit({
    ...nextKitBase,
    status: nextStatus,
  }, agentId), {
    action: 'customer.subscription.updated',
    source: input.source || 'stripe-subscription',
    status: 'succeeded',
    message: `Stripe subscription status changed to ${billingStatus}; site status is ${nextStatus}.`,
    actor: 'stripe-webhook',
    stripeCustomerId: input.stripeCustomerId || kit.billingProfile.stripeCustomerId || '',
    stripeSubscriptionId: input.stripeSubscriptionId || kit.billingProfile.stripeSubscriptionId || '',
    billingStatus,
    siteStatus: nextStatus,
  });
  const savedStores = await saveSiteConfig(nextKit, {
    role: input.source || 'stripe-subscription',
    email: normalizeEmail(input.email),
    userId: input.userId,
  });
  const summary = getLaunchKitSummary(nextKit);
  if (shouldNotifyBillingStatus(kit.billingProfile.billingStatus, billingStatus)) {
    await notifyBillingStatusChange({
      kit: nextKit,
      email: input.email,
      status: billingStatus,
      previousStatus: kit.billingProfile.billingStatus,
      gracePeriodEndsAt,
      publicUrl: summary.publicUrl,
    });
  }

  return {
    ...summary,
    savedStores,
  };
}

export async function expirePastDueGracePeriods(input: {
  now?: Date;
  limit?: number;
  source?: string;
} = {}): Promise<ExpirePastDueGracePeriodsResult> {
  const now = input.now || new Date();
  const nowIso = now.toISOString();
  const rows = await readExpiredPastDueSiteConfigs(nowIso, input.limit || 50);
  const processed: ExpirePastDueGracePeriodsResult['processed'] = [];

  for (const row of rows) {
    const kit = normalizeLaunchKit(row);
    const gracePeriodEndsAt = kit.billingProfile.gracePeriodEndsAt || '';

    if (kit.billingProfile.billingStatus !== 'past_due') {
      processed.push({ agentId: kit.agentId, status: 'skipped', reason: 'billing_not_past_due' });
      continue;
    }

    if (!gracePeriodEndsAt || isWithinGracePeriod(gracePeriodEndsAt, now)) {
      processed.push({ agentId: kit.agentId, status: 'skipped', reason: 'grace_not_expired' });
      continue;
    }

    if (kit.status === 'draft') {
      processed.push({ agentId: kit.agentId, status: 'skipped', reason: 'already_draft', siteStatus: kit.status });
      continue;
    }

    const expiredKit = appendProvisioningAuditEvent(normalizeLaunchKit({
      ...kit,
      status: 'draft',
      billingProfile: {
        ...kit.billingProfile,
        billingStatus: 'past_due',
        gracePeriodEndsAt,
      },
    }, kit.agentId), {
      action: 'billing.grace_period.expired',
      source: input.source || 'site-billing-grace-cron',
      status: 'succeeded',
      message: `Past-due grace window expired on ${gracePeriodEndsAt}; site moved to draft.`,
      actor: 'system-cron',
      stripeCustomerId: kit.billingProfile.stripeCustomerId || '',
      stripeSubscriptionId: kit.billingProfile.stripeSubscriptionId || '',
      billingStatus: 'past_due',
      siteStatus: 'draft',
    });

    const savedStores = await saveSiteConfig(expiredKit, {
      role: input.source || 'site-billing-grace-cron',
      userId: kit.ownerId,
    });
    const summary = getLaunchKitSummary(expiredKit);
    const [buyerEmail, operatorEmail] = await Promise.all([
      notifyBuyerSiteGraceExpired({
        kit: expiredKit,
        setupUrl: expiredKit.billingProfile.stripeCheckoutSessionId
          ? `/onboarding/site/setup?session_id=${encodeURIComponent(expiredKit.billingProfile.stripeCheckoutSessionId)}`
          : undefined,
      }),
      notifyOperatorSiteGraceExpired({
        kit: expiredKit,
        publicUrl: summary.publicUrl,
      }),
    ]);

    if (buyerEmail.status === 'failed') {
      console.warn('[SITE_GRACE_EXPIRED_BUYER_EMAIL_FAILED]', buyerEmail.reason);
    }
    if (operatorEmail.status === 'failed') {
      console.warn('[SITE_GRACE_EXPIRED_OPERATOR_EMAIL_FAILED]', operatorEmail.reason);
    }

    processed.push({
      agentId: kit.agentId,
      status: 'expired',
      siteStatus: 'draft',
      savedStores,
    });
  }

  return {
    scanned: rows.length,
    expired: processed.filter((item) => item.status === 'expired').length,
    skipped: processed.filter((item) => item.status === 'skipped').length,
    processed,
  };
}

export function resolveProvisionedAgentId(input: PaidAgentSiteProvisioningInput) {
  const explicitAgentId = normalizeAgentId(input.agentId);
  if (explicitAgentId) return explicitAgentId;

  const seed = firstString(
    input.userId,
    input.email,
    input.stripeCustomerId,
    input.stripeSubscriptionId,
    input.stripeCheckoutSessionId,
    input.ownerName,
  ) || 'paid-agent-site';
  const base = slugifyAgentId(input.ownerName)
    || slugifyAgentId(emailLocalPart(input.email))
    || slugifyAgentId(input.userId)
    || 'agent-site';
  const hash = createHash('sha1').update(seed).digest('hex').slice(0, 8);

  return normalizeAgentId(`${base.slice(0, 50)}-${hash}`) || `agent-site-${hash}`;
}

function normalizeSubscriptionTier(value: unknown): AgentLaunchKit['subscriptionTier'] | null {
  if (value === 'starter' || value === 'site' || value === 'atlas' || value === 'enterprise') {
    return value;
  }

  return null;
}

function normalizeBillingStatus(value: unknown): AgentLaunchKit['billingProfile']['billingStatus'] | null {
  if (
    value === 'unknown' ||
    value === 'trialing' ||
    value === 'active' ||
    value === 'past_due' ||
    value === 'canceled' ||
    value === 'unpaid' ||
    value === 'incomplete'
  ) {
    return value;
  }

  return null;
}

function resolveSiteStatusForBilling(
  kit: AgentLaunchKit,
  billingStatus: AgentLaunchKit['billingProfile']['billingStatus'],
  previousKit: AgentLaunchKit = kit,
): AgentLaunchKit['status'] {
  if (billingStatus === 'canceled' || billingStatus === 'unpaid') {
    return 'suspended';
  }

  if (billingStatus === 'past_due') {
    return isWithinGracePeriod(kit.billingProfile.gracePeriodEndsAt)
      ? kit.status
      : 'draft';
  }

  if (billingStatus === 'incomplete') {
    return 'draft';
  }

  if (billingStatus === 'active' || billingStatus === 'trialing') {
    const recoveredStatus = resolveRecoveredSiteStatus(previousKit, kit);
    if (recoveredStatus) {
      return recoveredStatus;
    }

    if (previousKit.status === 'suspended') {
      return 'draft';
    }

    return previousKit.status;
  }

  return kit.status;
}

function resolveRecoveredSiteStatus(
  previousKit: AgentLaunchKit,
  recoveredKit: AgentLaunchKit,
): AgentLaunchKit['status'] | null {
  const summary = getLaunchKitSummary(recoveredKit);
  if (!summary.readyToPublish) {
    return previousKit.status === 'suspended' ? 'draft' : previousKit.status;
  }

  const interruptedStatus = findLatestBillingInterruptedSiteStatus(previousKit);
  if (interruptedStatus === 'active') {
    return 'active';
  }

  if (interruptedStatus === 'draft') {
    return 'draft';
  }

  if (previousKit.status === 'active') {
    return 'active';
  }

  if (previousKit.status === 'suspended') {
    return 'draft';
  }

  return null;
}

function findLatestBillingInterruptedSiteStatus(kit: AgentLaunchKit) {
  for (const event of kit.provisioningAudit || []) {
    if (
      event.action === 'customer.subscription.updated'
      && isBillingInterruptionStatus(event.billingStatus)
      && event.siteStatus
    ) {
      return event.siteStatus;
    }

    if (
      event.action === 'customer.subscription.deleted'
      && event.siteStatus === 'active'
    ) {
      return 'active';
    }
  }

  return null;
}

function isBillingInterruptionStatus(value?: AgentLaunchKit['billingProfile']['billingStatus']) {
  return value === 'past_due' || value === 'unpaid' || value === 'canceled' || value === 'incomplete';
}

function normalizeIsoDate(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return '';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : '';
}

function dateDaysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function resolveGracePeriodEndsAt(
  kit: AgentLaunchKit,
  billingStatus: AgentLaunchKit['billingProfile']['billingStatus'],
) {
  if (billingStatus !== 'past_due') return '';
  if (kit.billingProfile.billingStatus === 'past_due' && kit.billingProfile.gracePeriodEndsAt) {
    return kit.billingProfile.gracePeriodEndsAt;
  }
  if (isWithinGracePeriod(kit.billingProfile.gracePeriodEndsAt)) {
    return kit.billingProfile.gracePeriodEndsAt || '';
  }

  return dateDaysFromNow(PAST_DUE_GRACE_DAYS);
}

function isWithinGracePeriod(value?: string, now = new Date()) {
  if (!value) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.getTime() > now.getTime();
}

function shouldNotifyBillingStatus(
  previousStatus: AgentLaunchKit['billingProfile']['billingStatus'],
  nextStatus: AgentLaunchKit['billingProfile']['billingStatus'],
) {
  if (previousStatus === nextStatus) return false;
  return nextStatus === 'past_due'
    || nextStatus === 'unpaid'
    || nextStatus === 'canceled'
    || nextStatus === 'incomplete'
    || ((nextStatus === 'active' || nextStatus === 'trialing')
      && (previousStatus === 'past_due' || previousStatus === 'unpaid' || previousStatus === 'canceled' || previousStatus === 'incomplete'));
}

async function notifyBillingStatusChange(input: {
  kit: AgentLaunchKit;
  email?: string | null;
  status: AgentLaunchKit['billingProfile']['billingStatus'];
  previousStatus?: AgentLaunchKit['billingProfile']['billingStatus'];
  gracePeriodEndsAt?: string;
  publicUrl?: string;
}) {
  const [buyerResult, operatorResult] = await Promise.all([
    notifyBuyerSiteBillingUpdate(input),
    notifyOperatorSiteBillingUpdate(input),
  ]);

  if (buyerResult.status === 'failed') {
    console.warn('[SITE_BILLING_BUYER_EMAIL_FAILED]', buyerResult.reason);
  }
  if (operatorResult.status === 'failed') {
    console.warn('[SITE_BILLING_OPERATOR_EMAIL_FAILED]', operatorResult.reason);
  }
}

function normalizeEmail(value: unknown) {
  if (typeof value !== 'string') return '';
  const email = value.trim().toLowerCase();
  return email.includes('@') ? email : '';
}

function normalizePersonName(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, 120);
}

function deriveNameFromEmail(email: string) {
  const local = emailLocalPart(email);
  if (!local) return '';

  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function emailLocalPart(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim().split('@')[0] || '';
}

function slugifyAgentId(value: unknown) {
  if (typeof value !== 'string') return '';
  return value
    .trim()
    .toLowerCase()
    .replace(/@.*$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

function firstString(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }

  return '';
}

function appendProvisioningAuditEvent(
  kit: AgentLaunchKit,
  event: Omit<LaunchKitProvisioningAuditEvent, 'id' | 'occurredAt'> & {
    id?: string;
    occurredAt?: string;
  },
) {
  const occurredAt = normalizeIsoDate(event.occurredAt) || new Date().toISOString();
  const auditEvent: LaunchKitProvisioningAuditEvent = {
    id: event.id || createAuditEventId(event.action, occurredAt),
    occurredAt,
    action: event.action,
    source: event.source,
    status: event.status,
    message: event.message,
    actor: event.actor,
    stripeCheckoutSessionId: event.stripeCheckoutSessionId,
    stripeCustomerId: event.stripeCustomerId,
    stripeSubscriptionId: event.stripeSubscriptionId,
    billingStatus: event.billingStatus,
    siteStatus: event.siteStatus,
    savedStores: event.savedStores,
  };

  return normalizeLaunchKit({
    ...kit,
    provisioningAudit: [
      auditEvent,
      ...(kit.provisioningAudit || []),
    ].slice(0, 80),
  }, kit.agentId);
}

function createAuditEventId(action: string, occurredAt: string) {
  const seed = `${action}:${occurredAt}:${Math.random().toString(36).slice(2)}`;
  return createHash('sha1').update(seed).digest('hex').slice(0, 16);
}
