import type { AgentLaunchKit } from '@/lib/sites/launchKit';

export type SiteLifecycleEmailResult =
  | { status: 'sent'; id: string | null; recipients: string[] }
  | { status: 'skipped'; reason: string; recipients: string[] }
  | { status: 'failed'; reason: string; recipients: string[]; responseStatus?: number };

export async function notifyBuyerSiteProvisioned(input: {
  kit: AgentLaunchKit;
  email?: string | null;
  setupUrl: string;
}): Promise<SiteLifecycleEmailResult> {
  const recipients = uniqueEmails([input.email, input.kit.agentProfile.email, input.kit.integrationProfile.leadEmail]);
  return sendLifecycleEmail({
    recipients,
    subject: `Your ${input.kit.branding.siteName} draft site is ready`,
    text: [
      `Your Sunset Pulse site workspace is ready.`,
      ``,
      `Site: ${input.kit.branding.siteName}`,
      `Agent ID: ${input.kit.agentId}`,
      `Trial status: ${input.kit.billingProfile.billingStatus}`,
      `Trial ends: ${input.kit.billingProfile.trialEndsAt || 'Not set'}`,
      ``,
      `Continue setup: ${absoluteUrl(input.setupUrl)}`,
      ``,
      `Publishing stays locked until the operator review checklist is complete.`,
    ].join('\n'),
    idempotencyKey: `site-provisioned-${input.kit.billingProfile.stripeCheckoutSessionId || input.kit.agentId}`,
  });
}

export async function notifyOperatorSiteSetupSaved(input: {
  kit: AgentLaunchKit;
  setupUrl: string;
  reviewUrl: string;
  requestedReview?: boolean;
}): Promise<SiteLifecycleEmailResult> {
  const recipients = uniqueEmails([
    process.env.SITE_LIFECYCLE_TO_EMAIL,
    process.env.SITE_REVIEW_NOTIFICATION_EMAIL,
    process.env.AGENT_LEAD_NOTIFICATION_EMAIL,
    process.env.OPERATOR_EMAIL,
    process.env.ADMIN_EMAIL,
  ]);
  return sendLifecycleEmail({
    recipients,
    subject: input.requestedReview
      ? `Review requested: ${input.kit.branding.siteName}`
      : `Agent site setup saved: ${input.kit.branding.siteName}`,
    text: [
      input.requestedReview
        ? `A buyer requested operator review for their agent site.`
        : `A buyer saved setup details for their agent site.`,
      ``,
      `Site: ${input.kit.branding.siteName}`,
      `Agent ID: ${input.kit.agentId}`,
      `Owner: ${input.kit.ownerName}`,
      `Review status: ${input.kit.reviewProfile.status}`,
      `Buyer setup: ${absoluteUrl(input.setupUrl)}`,
      `Operator queue: ${absoluteUrl(input.reviewUrl)}`,
    ].join('\n'),
    idempotencyKey: `${input.requestedReview ? 'site-review-requested' : 'site-setup-saved'}-${input.kit.agentId}-${input.kit.reviewProfile.requestedAt || input.kit.billingProfile.stripeCheckoutSessionId || 'draft'}`,
  });
}

export async function notifyBuyerSiteReviewDecision(input: {
  kit: AgentLaunchKit;
  email?: string | null;
  setupUrl: string;
  publicUrl?: string;
  decision: 'approved' | 'changes_requested';
  notes?: string;
}): Promise<SiteLifecycleEmailResult> {
  const subject = input.decision === 'approved'
    ? `${input.kit.branding.siteName} is approved`
    : `${input.kit.branding.siteName} needs a few updates`;
  const text = input.decision === 'approved'
    ? [
      `${input.kit.branding.siteName} has been approved by Sunset Pulse.`,
      input.publicUrl ? `Public site: ${input.publicUrl}` : `Setup page: ${input.setupUrl}`,
      input.notes ? `Operator notes: ${input.notes}` : '',
    ].filter(Boolean).join('\n')
    : [
      `Sunset Pulse reviewed ${input.kit.branding.siteName} and requested a few changes before publishing.`,
      `Setup page: ${input.setupUrl}`,
      input.notes ? `Operator notes: ${input.notes}` : '',
    ].filter(Boolean).join('\n');

  return sendLifecycleEmail({
    recipients: uniqueEmails([input.email]),
    subject,
    text,
    idempotencyKey: `site-review-${input.decision}-${input.kit.agentId}-${input.kit.reviewProfile.reviewedAt || 'pending'}`,
  });
}

async function sendLifecycleEmail(input: {
  recipients: string[];
  subject: string;
  text: string;
  idempotencyKey: string;
}): Promise<SiteLifecycleEmailResult> {
  if (!input.recipients.length) {
    return { status: 'skipped', reason: 'No recipients configured.', recipients: input.recipients };
  }

  if (process.env.SITE_LIFECYCLE_EMAILS_DISABLED === 'true') {
    return { status: 'skipped', reason: 'SITE_LIFECYCLE_EMAILS_DISABLED=true', recipients: input.recipients };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { status: 'skipped', reason: 'Missing RESEND_API_KEY.', recipients: input.recipients };
  }

  const from = process.env.SITE_LIFECYCLE_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || 'Sunset Pulse <no-reply@sunsetpulse.ai>';

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': input.idempotencyKey,
      },
      body: JSON.stringify({
        from,
        to: input.recipients,
        subject: input.subject,
        text: input.text,
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return {
        status: 'failed',
        reason: payload?.message || 'Resend request failed.',
        responseStatus: response.status,
        recipients: input.recipients,
      };
    }

    return { status: 'sent', id: payload?.id || null, recipients: input.recipients };
  } catch (error: any) {
    return {
      status: 'failed',
      reason: error?.message || 'Email notification request failed.',
      recipients: input.recipients,
    };
  }
}

function absoluteUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${getPublicBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

function getPublicBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_DOMAIN ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '') ||
    'https://sunsetpulse.app'
  ).replace(/\/+$/, '');
}

function uniqueEmails(values: Array<string | undefined | null>) {
  const seen = new Set<string>();

  for (const value of values) {
    const email = String(value || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
    seen.add(email);
  }

  return Array.from(seen);
}
