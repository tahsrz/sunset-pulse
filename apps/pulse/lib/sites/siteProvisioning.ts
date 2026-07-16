import { createHash } from 'node:crypto';
import { normalizeAgentId } from '@/lib/sites/agentConfig';
import {
  createDefaultLaunchKit,
  getLaunchKitSummary,
  normalizeLaunchKit,
  type AgentLaunchKit,
  type AgentLaunchKitResponse,
} from '@/lib/sites/launchKit';
import { readSiteConfig, saveSiteConfig } from '@/lib/sites/siteConfigStore';
import { notifyBuyerSiteProvisioned } from '@/lib/sites/siteLifecycleNotifications';

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

  const billingStatus = normalizeBillingStatus(input.billingStatus) || baseKit.billingProfile.billingStatus || 'trialing';
  const trialEndsAt = normalizeIsoDate(input.trialEndsAt) || baseKit.billingProfile.trialEndsAt || dateDaysFromNow(90);

  const kit = normalizeLaunchKit({
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
  }, agentId);

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
  const suspendedKit = normalizeLaunchKit({
    ...kit,
    status: 'suspended',
    billingProfile: {
      ...kit.billingProfile,
      stripeCustomerId: input.stripeCustomerId || kit.billingProfile.stripeCustomerId || '',
      stripeSubscriptionId: input.stripeSubscriptionId || kit.billingProfile.stripeSubscriptionId || '',
      billingStatus: 'canceled',
    },
  }, agentId);
  const savedStores = await saveSiteConfig(suspendedKit, {
    role: input.source || 'stripe-webhook',
    email: normalizeEmail(input.email),
    userId: input.userId,
  });

  return {
    ...getLaunchKitSummary(suspendedKit),
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
  const nextKitBase = normalizeLaunchKit({
    ...kit,
    billingProfile: {
      ...kit.billingProfile,
      stripeCustomerId: input.stripeCustomerId || kit.billingProfile.stripeCustomerId || '',
      stripeSubscriptionId: input.stripeSubscriptionId || kit.billingProfile.stripeSubscriptionId || '',
      trialEndsAt,
      billingStatus,
    },
  }, agentId);
  const nextStatus = resolveSiteStatusForBilling(nextKitBase, billingStatus);
  const nextKit = normalizeLaunchKit({
    ...nextKitBase,
    status: nextStatus,
  }, agentId);
  const savedStores = await saveSiteConfig(nextKit, {
    role: input.source || 'stripe-subscription',
    email: normalizeEmail(input.email),
    userId: input.userId,
  });

  return {
    ...getLaunchKitSummary(nextKit),
    savedStores,
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
): AgentLaunchKit['status'] {
  if (billingStatus === 'canceled' || billingStatus === 'unpaid') {
    return 'suspended';
  }

  if (billingStatus === 'past_due' || billingStatus === 'incomplete') {
    return 'draft';
  }

  if (billingStatus === 'active' || billingStatus === 'trialing') {
    const summary = getLaunchKitSummary(kit);
    if (kit.reviewProfile.status === 'approved' && summary.readyToPublish) {
      return 'active';
    }

    return kit.status === 'suspended' ? 'draft' : kit.status;
  }

  return kit.status;
}

function normalizeIsoDate(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return '';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : '';
}

function dateDaysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
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
