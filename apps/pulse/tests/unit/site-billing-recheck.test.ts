import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultLaunchKit } from '@/lib/sites/launchKit';

const recheckMocks = vi.hoisted(() => ({
  retrieve: vi.fn(),
  list: vi.fn(),
  updateProvisionedAgentSiteBilling: vi.fn(),
}));

vi.mock('@/lib/stripeClient', () => ({
  getStripeClient: () => ({
    subscriptions: {
      retrieve: recheckMocks.retrieve,
      list: recheckMocks.list,
    },
  }),
}));

vi.mock('@/lib/sites/siteProvisioning', () => ({
  updateProvisionedAgentSiteBilling: recheckMocks.updateProvisionedAgentSiteBilling,
}));

import { recheckSiteBillingFromStripe } from '@/lib/billing/siteBillingRecheck';

describe('site billing Stripe recheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recheckMocks.updateProvisionedAgentSiteBilling.mockResolvedValue({
      kit: { agentId: 'broker-one', status: 'active' },
      created: false,
      savedStores: ['supabase', 'mongo'],
      readyToPublish: true,
    });
  });

  it('restores billing from the stored Stripe subscription', async () => {
    recheckMocks.retrieve.mockResolvedValue(subscription({
      id: 'sub_123',
      status: 'active',
      customer: 'cus_123',
      trial_end: 1784227200,
    }));
    const kit = {
      ...createDefaultLaunchKit('broker-one'),
      ownerId: 'user_123',
      subscriptionTier: 'atlas',
      agentProfile: {
        ...createDefaultLaunchKit('broker-one').agentProfile,
        email: 'agent@example.test',
      },
      billingProfile: {
        billingStatus: 'past_due',
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123',
        userId: 'user_123',
      },
    };

    const result = await recheckSiteBillingFromStripe({ kit, source: 'admin-billing-recheck' });

    expect(result.selectedBy).toBe('stored_subscription');
    expect(result.stripeStatus).toBe('active');
    expect(recheckMocks.updateProvisionedAgentSiteBilling).toHaveBeenCalledWith(expect.objectContaining({
      agentId: 'broker-one',
      userId: 'user_123',
      email: 'agent@example.test',
      subscriptionTier: 'atlas',
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
      billingStatus: 'active',
      trialEndsAt: '2026-07-16T18:40:00.000Z',
      source: 'admin-billing-recheck',
    }));
  });

  it('falls back to an active customer subscription when the stored subscription is deleted', async () => {
    recheckMocks.retrieve.mockResolvedValue({ id: 'sub_deleted', deleted: true });
    recheckMocks.list.mockResolvedValue({
      data: [
        subscription({ id: 'sub_old', status: 'canceled', customer: 'cus_123' }),
        subscription({ id: 'sub_active', status: 'trialing', customer: 'cus_123' }),
      ],
    });
    const kit = {
      ...createDefaultLaunchKit('broker-one'),
      billingProfile: {
        billingStatus: 'canceled',
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_deleted',
      },
    };

    const result = await recheckSiteBillingFromStripe({ kit });

    expect(result.selectedBy).toBe('customer_subscription');
    expect(result.stripeSubscriptionId).toBe('sub_active');
    expect(recheckMocks.updateProvisionedAgentSiteBilling).toHaveBeenCalledWith(expect.objectContaining({
      billingStatus: 'trialing',
      stripeSubscriptionId: 'sub_active',
    }));
  });

  it('rejects sites without a Stripe billing pointer', async () => {
    await expect(recheckSiteBillingFromStripe({
      kit: createDefaultLaunchKit('broker-one'),
    })).rejects.toThrow('This site does not have a Stripe subscription or customer to recheck.');
  });
});

function subscription(overrides: Record<string, unknown>) {
  return {
    id: 'sub_123',
    status: 'active',
    customer: 'cus_123',
    trial_end: null,
    ...overrides,
  };
}
