import { supabaseAdmin } from '@/lib/supabase';

const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const STALE_PROCESSING_MS = 5 * 60 * 1000;

export type ProvisioningSiteRow = {
  agent_id?: string | null;
  status?: string | null;
  billing_profile?: {
    billingStatus?: string | null;
    gracePeriodEndsAt?: string | null;
  } | null;
  provisioning_audit?: Array<{
    action?: string | null;
    occurredAt?: string | null;
    billingStatus?: string | null;
    siteStatus?: string | null;
  }> | null;
};

export type StripeWebhookLedgerRow = {
  event_id?: string | null;
  event_type?: string | null;
  object_id?: string | null;
  status?: 'processing' | 'succeeded' | 'failed' | string | null;
  received_at?: string | null;
  completed_at?: string | null;
  failed_at?: string | null;
  error_message?: string | null;
  duplicate_count?: number | null;
};

export type SiteProvisioningObservability = ReturnType<typeof summarizeProvisioningObservability>;

export async function getSiteProvisioningObservability(siteRows: ProvisioningSiteRow[]) {
  const since = new Date(Date.now() - RECENT_WINDOW_MS).toISOString();
  const { data, error } = await supabaseAdmin
    .from('stripe_webhook_events')
    .select('event_id, event_type, object_id, status, received_at, completed_at, failed_at, error_message, duplicate_count')
    .gte('received_at', since)
    .order('received_at', { ascending: false })
    .limit(100);

  return summarizeProvisioningObservability({
    siteRows,
    webhookRows: ((data || []) as StripeWebhookLedgerRow[]),
    webhookError: error?.message || null,
  });
}

export function summarizeProvisioningObservability(input: {
  siteRows: ProvisioningSiteRow[];
  webhookRows: StripeWebhookLedgerRow[];
  webhookError?: string | null;
}) {
  const now = Date.now();
  const staleBefore = now - STALE_PROCESSING_MS;
  const recentSince = now - RECENT_WINDOW_MS;
  const webhookRows = input.webhookRows || [];
  const siteRows = input.siteRows || [];
  const failedWebhookRows = webhookRows.filter((row) => row.status === 'failed');
  const staleProcessingRows = webhookRows.filter((row) => row.status === 'processing' && toTime(row.received_at) < staleBefore);
  const duplicateCount = webhookRows.reduce((sum, row) => sum + Math.max(0, Number(row.duplicate_count || 0)), 0);
  const latestFailure = failedWebhookRows[0] || null;
  const recentProvisionedCount = countAuditEvents(siteRows, (event) => (
    event.action === 'checkout.session.completed'
    && toTime(event.occurredAt) >= recentSince
  ));
  const recentRecoveryCount = countAuditEvents(siteRows, (event) => (
    (event.billingStatus === 'active' || event.billingStatus === 'trialing')
    && toTime(event.occurredAt) >= recentSince
  ));
  const graceExpiredCount = countAuditEvents(siteRows, (event) => (
    event.action === 'billing.grace_period.expired'
    && toTime(event.occurredAt) >= recentSince
  ));
  const graceExpiringSoonCount = siteRows.filter(isGraceExpiringSoon).length;

  return {
    generatedAt: new Date(now).toISOString(),
    windows: {
      recentDays: 7,
      staleProcessingMinutes: 5,
      graceSoonHours: 48,
    },
    webhooks: {
      available: !input.webhookError,
      error: input.webhookError || '',
      totalRecent: webhookRows.length,
      succeeded: webhookRows.filter((row) => row.status === 'succeeded').length,
      failed: failedWebhookRows.length,
      processing: webhookRows.filter((row) => row.status === 'processing').length,
      staleProcessing: staleProcessingRows.length,
      duplicates: duplicateCount,
      latestFailure: latestFailure ? {
        eventId: latestFailure.event_id || '',
        eventType: latestFailure.event_type || '',
        objectId: latestFailure.object_id || '',
        failedAt: latestFailure.failed_at || latestFailure.received_at || '',
        message: latestFailure.error_message || 'Stripe webhook failed without an error message.',
      } : null,
    },
    sites: {
      totalObserved: siteRows.length,
      recentProvisioned: recentProvisionedCount,
      recentRecovered: recentRecoveryCount,
      graceExpired: graceExpiredCount,
      graceExpiringSoon: graceExpiringSoonCount,
      pastDue: siteRows.filter((row) => row.billing_profile?.billingStatus === 'past_due').length,
    },
  };
}

function countAuditEvents(
  rows: ProvisioningSiteRow[],
  predicate: (event: NonNullable<ProvisioningSiteRow['provisioning_audit']>[number]) => boolean,
) {
  return rows.reduce((count, row) => count + (row.provisioning_audit || []).filter(predicate).length, 0);
}

function isGraceExpiringSoon(row: ProvisioningSiteRow) {
  if (row.billing_profile?.billingStatus !== 'past_due') return false;
  const graceEndsAt = row.billing_profile?.gracePeriodEndsAt;
  const graceTime = toTime(graceEndsAt);
  if (!graceTime) return false;
  const now = Date.now();
  const twoDays = 48 * 60 * 60 * 1000;
  return graceTime > now && graceTime <= now + twoDays;
}

function toTime(value?: string | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}
