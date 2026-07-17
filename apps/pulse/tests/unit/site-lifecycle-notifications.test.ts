import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultLaunchKit } from '@/lib/sites/launchKit';
import {
  notifyBuyerSiteBillingUpdate,
  notifyOperatorSiteBillingUpdate,
  notifyOperatorStripeWebhookFailure,
} from '@/lib/sites/siteLifecycleNotifications';

describe('site lifecycle notifications', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.RESEND_API_KEY = 'resend-key';
    process.env.SITE_LIFECYCLE_FROM_EMAIL = 'Sunset Pulse <alerts@sunsetpulse.app>';
    process.env.NEXT_PUBLIC_DOMAIN = 'https://sunsetpulse.app';
    process.env.OPERATOR_EMAIL = 'ops@example.test';
    delete process.env.SITE_LIFECYCLE_EMAILS_DISABLED;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ id: 'email_123' }),
    }));
  });

  it('tells the buyer when recovered billing returned the site live', async () => {
    const kit = {
      ...createDefaultLaunchKit('broker-one'),
      status: 'active',
      agentProfile: {
        ...createDefaultLaunchKit('broker-one').agentProfile,
        email: 'buyer@example.test',
      },
      billingProfile: {
        billingStatus: 'active',
        billingStatusChangedAt: '2026-07-17T15:00:00.000Z',
      },
    };

    await notifyBuyerSiteBillingUpdate({
      kit,
      status: 'active',
      previousStatus: 'past_due',
    });

    const payload = sentEmailPayload();
    expect(payload.subject).toBe(`${kit.branding.siteName} billing recovered`);
    expect(payload.text).toContain('billing is active again');
    expect(payload.text).toContain('has returned live because billing recovered');
  });

  it('tells the buyer when recovered billing stayed draft', async () => {
    const kit = {
      ...createDefaultLaunchKit('broker-one'),
      status: 'draft',
      agentProfile: {
        ...createDefaultLaunchKit('broker-one').agentProfile,
        email: 'buyer@example.test',
      },
      billingProfile: {
        billingStatus: 'active',
        billingStatusChangedAt: '2026-07-17T15:00:00.000Z',
      },
    };

    await notifyBuyerSiteBillingUpdate({
      kit,
      status: 'active',
      previousStatus: 'past_due',
    });

    const payload = sentEmailPayload();
    expect(payload.text).toContain('billing-current');
    expect(payload.text).toContain('remains in draft until setup and operator approval are complete');
  });

  it('summarizes recovered draft state for operators', async () => {
    const kit = {
      ...createDefaultLaunchKit('broker-one'),
      status: 'draft',
      billingProfile: {
        billingStatus: 'active',
        billingStatusChangedAt: '2026-07-17T15:00:00.000Z',
      },
    };

    await notifyOperatorSiteBillingUpdate({
      kit,
      status: 'active',
      previousStatus: 'past_due',
      publicUrl: 'https://broker-one.sunsetpulse.app',
    });

    const payload = sentEmailPayload();
    expect(payload.subject).toBe(`Billing recovered: ${kit.branding.siteName}`);
    expect(payload.text).toContain('Billing recovered, but the site stayed draft');
    expect(payload.text).toContain('Site status: draft');
  });

  it('alerts operators when a claimed Stripe webhook fails', async () => {
    await notifyOperatorStripeWebhookFailure({
      eventId: 'evt_failed',
      eventType: 'customer.subscription.updated',
      objectId: 'sub_123',
      livemode: false,
      stores: ['supabase', 'mongo'],
      error: new Error('database unavailable'),
    });

    const payload = sentEmailPayload();
    expect(payload.to).toEqual(['ops@example.test']);
    expect(payload.subject).toBe('Stripe webhook failed: customer.subscription.updated');
    expect(payload.text).toContain('Event ID: evt_failed');
    expect(payload.text).toContain('Object ID: sub_123');
    expect(payload.text).toContain('Mode: test');
    expect(payload.text).toContain('Ledger stores: supabase, mongo');
    expect(payload.text).toContain('Error: database unavailable');
  });
});

function sentEmailPayload() {
  const fetchMock = vi.mocked(fetch);
  const [, init] = fetchMock.mock.calls.at(-1) || [];
  return JSON.parse(String(init?.body || '{}'));
}
