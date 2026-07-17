import { afterEach, describe, expect, it, vi } from 'vitest';
import { summarizeProvisioningObservability } from '@/lib/billing/siteProvisioningObservability';

describe('site provisioning observability', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('summarizes webhook failures, duplicates, recovery, and grace events', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-17T12:00:00.000Z'));

    const summary = summarizeProvisioningObservability({
      webhookRows: [
        {
          event_id: 'evt_failed',
          event_type: 'checkout.session.completed',
          object_id: 'cs_failed',
          status: 'failed',
          received_at: '2026-07-17T11:56:00.000Z',
          failed_at: '2026-07-17T11:57:00.000Z',
          error_message: 'database unavailable',
          duplicate_count: 2,
        },
        {
          event_id: 'evt_processing',
          event_type: 'customer.subscription.updated',
          status: 'processing',
          received_at: '2026-07-17T11:50:00.000Z',
          duplicate_count: 1,
        },
        {
          event_id: 'evt_ok',
          event_type: 'customer.subscription.updated',
          status: 'succeeded',
          received_at: '2026-07-17T11:59:00.000Z',
        },
      ],
      siteRows: [
        {
          agent_id: 'broker-one',
          status: 'active',
          billing_profile: {
            billingStatus: 'past_due',
            gracePeriodEndsAt: '2026-07-18T12:00:00.000Z',
          },
          provisioning_audit: [
            {
              action: 'checkout.session.completed',
              occurredAt: '2026-07-17T10:00:00.000Z',
              billingStatus: 'trialing',
              siteStatus: 'draft',
            },
            {
              action: 'customer.subscription.updated',
              occurredAt: '2026-07-17T11:00:00.000Z',
              billingStatus: 'active',
              siteStatus: 'active',
            },
            {
              action: 'billing.grace_period.expired',
              occurredAt: '2026-07-17T11:30:00.000Z',
              billingStatus: 'past_due',
              siteStatus: 'draft',
            },
          ],
        },
      ],
    });

    expect(summary.webhooks).toEqual(expect.objectContaining({
      totalRecent: 3,
      failed: 1,
      processing: 1,
      staleProcessing: 1,
      duplicates: 3,
    }));
    expect(summary.webhooks.latestFailure).toEqual(expect.objectContaining({
      eventId: 'evt_failed',
      eventType: 'checkout.session.completed',
      message: 'database unavailable',
    }));
    expect(summary.sites).toEqual(expect.objectContaining({
      recentProvisioned: 1,
      recentRecovered: 2,
      graceExpired: 1,
      graceExpiringSoon: 1,
      pastDue: 1,
    }));
  });

  it('marks the webhook ledger unavailable when the Supabase read fails', () => {
    const summary = summarizeProvisioningObservability({
      webhookRows: [],
      siteRows: [],
      webhookError: 'relation does not exist',
    });

    expect(summary.webhooks.available).toBe(false);
    expect(summary.webhooks.error).toBe('relation does not exist');
  });
});
