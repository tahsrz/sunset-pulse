import { beforeEach, describe, expect, it, vi } from 'vitest';

const replayMocks = vi.hoisted(() => ({
  eventsRetrieve: vi.fn(),
  checkoutSessionRetrieve: vi.fn(),
  subscriptionRetrieve: vi.fn(),
  provisionPaidAgentSite: vi.fn(),
  updateProvisionedAgentSiteBilling: vi.fn(),
  suspendProvisionedAgentSite: vi.fn(),
}));

vi.mock('@/lib/stripeClient', () => ({
  getStripeClient: () => ({
    events: {
      retrieve: replayMocks.eventsRetrieve,
    },
    checkout: {
      sessions: {
        retrieve: replayMocks.checkoutSessionRetrieve,
      },
    },
    subscriptions: {
      retrieve: replayMocks.subscriptionRetrieve,
    },
  }),
}));

vi.mock('@/lib/sites/siteProvisioning', () => ({
  provisionPaidAgentSite: replayMocks.provisionPaidAgentSite,
  updateProvisionedAgentSiteBilling: replayMocks.updateProvisionedAgentSiteBilling,
  suspendProvisionedAgentSite: replayMocks.suspendProvisionedAgentSite,
}));

import { replayStripeSiteEvent } from '@/lib/billing/stripeEventReplay';

describe('Stripe event replay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    replayMocks.provisionPaidAgentSite.mockResolvedValue({
      kit: { agentId: 'broker-one' },
      savedStores: ['supabase', 'mongo'],
    });
    replayMocks.updateProvisionedAgentSiteBilling.mockResolvedValue({
      kit: { agentId: 'broker-one' },
      savedStores: ['supabase', 'mongo'],
    });
    replayMocks.suspendProvisionedAgentSite.mockResolvedValue({
      kit: { agentId: 'broker-one' },
      savedStores: ['supabase', 'mongo'],
    });
  });

  it('replays a completed site checkout from the expanded Stripe session', async () => {
    replayMocks.eventsRetrieve.mockResolvedValue({
      id: 'evt_checkout',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_site_123' } },
    });
    replayMocks.checkoutSessionRetrieve.mockResolvedValue({
      id: 'cs_site_123',
      mode: 'subscription',
      created: 1784235600,
      customer: 'cus_123',
      customer_email: 'buyer@example.test',
      client_reference_id: 'user-1',
      subscription: {
        id: 'sub_123',
        status: 'trialing',
        trial_end: 1784235600 + 90 * 24 * 60 * 60,
      },
      metadata: {
        productType: 'agent_site',
        agentId: 'broker-one',
        userId: 'user-1',
        ownerName: 'Broker One',
        subscriptionTier: 'atlas',
      },
    });

    const result = await replayStripeSiteEvent({ eventId: 'evt_checkout', source: 'test-replay' });

    expect(result.action).toBe('checkout_replayed');
    expect(replayMocks.checkoutSessionRetrieve).toHaveBeenCalledWith('cs_site_123', {
      expand: ['subscription'],
    });
    expect(replayMocks.provisionPaidAgentSite).toHaveBeenCalledWith(expect.objectContaining({
      agentId: 'broker-one',
      userId: 'user-1',
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
      billingStatus: 'trialing',
      source: 'test-replay',
    }));
  });

  it('reconciles invoice payment failures through the current subscription state', async () => {
    replayMocks.eventsRetrieve.mockResolvedValue({
      id: 'evt_invoice_failed',
      type: 'invoice.payment_failed',
      data: {
        object: {
          id: 'in_123',
          subscription: 'sub_123',
        },
      },
    });
    replayMocks.subscriptionRetrieve.mockResolvedValue({
      id: 'sub_123',
      status: 'past_due',
      customer: 'cus_123',
      trial_end: null,
      metadata: {
        productType: 'agent_site',
        agentId: 'broker-one',
        userId: 'user-1',
      },
    });

    const result = await replayStripeSiteEvent({ eventId: 'evt_invoice_failed', source: 'test-replay' });

    expect(result.action).toBe('invoice_subscription_reconciled');
    expect(replayMocks.subscriptionRetrieve).toHaveBeenCalledWith('sub_123');
    expect(replayMocks.updateProvisionedAgentSiteBilling).toHaveBeenCalledWith(expect.objectContaining({
      agentId: 'broker-one',
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
      billingStatus: 'past_due',
      source: 'test-replay',
    }));
  });

  it('suspends a site from a deleted subscription event', async () => {
    replayMocks.eventsRetrieve.mockResolvedValue({
      id: 'evt_deleted',
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_123',
          customer: 'cus_123',
          metadata: {
            productType: 'agent_site',
            agentId: 'broker-one',
          },
        },
      },
    });

    const result = await replayStripeSiteEvent({ eventId: 'evt_deleted', source: 'test-replay' });

    expect(result.action).toBe('subscription_suspended');
    expect(replayMocks.suspendProvisionedAgentSite).toHaveBeenCalledWith(expect.objectContaining({
      agentId: 'broker-one',
      stripeSubscriptionId: 'sub_123',
      source: 'test-replay',
    }));
  });
});
