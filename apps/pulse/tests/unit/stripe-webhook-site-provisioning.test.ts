import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const webhookMocks = vi.hoisted(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_123';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';

  return {
    constructEvent: vi.fn(),
    headersGet: vi.fn(() => 'sig_test_123'),
    connectDB: vi.fn(),
    userFindOneAndUpdate: vi.fn(),
    orderFindById: vi.fn(),
    orderFindByIdAndUpdate: vi.fn(),
    provisionPaidAgentSite: vi.fn(),
    suspendProvisionedAgentSite: vi.fn(),
    updateProvisionedAgentSiteBilling: vi.fn(),
    notifyStaffOfBurgerOrder: vi.fn(),
    dispatchPaidOrderPhoneRelay: vi.fn(),
    sendOrderConfirmationEmail: vi.fn(),
    claimStripeWebhookEvent: vi.fn(),
    completeStripeWebhookEvent: vi.fn(),
    failStripeWebhookEvent: vi.fn(),
  };
});

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: webhookMocks.constructEvent,
    },
  })),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: webhookMocks.headersGet,
  }),
}));

vi.mock('@/lib/core/database', () => ({
  default: webhookMocks.connectDB,
}));

vi.mock('@/models/User', () => ({
  default: {
    findOneAndUpdate: webhookMocks.userFindOneAndUpdate,
  },
}));

vi.mock('@/models/Order', () => ({
  default: {
    findById: webhookMocks.orderFindById,
    findByIdAndUpdate: webhookMocks.orderFindByIdAndUpdate,
  },
}));

vi.mock('@/lib/core/prisma', () => ({
  prisma: {
    booking: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

vi.mock('@/lib/twilio', () => ({
  notifyStaffOfBurgerOrder: webhookMocks.notifyStaffOfBurgerOrder,
}));

vi.mock('@/lib/grill/phoneRelay', () => ({
  dispatchPaidOrderPhoneRelay: webhookMocks.dispatchPaidOrderPhoneRelay,
}));

vi.mock('@/lib/grill/orderConfirmationEmail', () => ({
  sendOrderConfirmationEmail: webhookMocks.sendOrderConfirmationEmail,
}));

vi.mock('@/lib/billing/stripeWebhookLedger', () => ({
  claimStripeWebhookEvent: webhookMocks.claimStripeWebhookEvent,
  completeStripeWebhookEvent: webhookMocks.completeStripeWebhookEvent,
  failStripeWebhookEvent: webhookMocks.failStripeWebhookEvent,
}));

vi.mock('@/lib/sites/siteProvisioning', () => ({
  provisionPaidAgentSite: webhookMocks.provisionPaidAgentSite,
  suspendProvisionedAgentSite: webhookMocks.suspendProvisionedAgentSite,
  updateProvisionedAgentSiteBilling: webhookMocks.updateProvisionedAgentSiteBilling,
}));

import { POST } from '@/app/api/webhook/stripe/route';

describe('Stripe webhook site provisioning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    webhookMocks.headersGet.mockReturnValue('sig_test_123');
    webhookMocks.connectDB.mockResolvedValue(undefined);
    webhookMocks.userFindOneAndUpdate.mockResolvedValue({});
    webhookMocks.orderFindById.mockResolvedValue(null);
    webhookMocks.orderFindByIdAndUpdate.mockResolvedValue({});
    webhookMocks.provisionPaidAgentSite.mockResolvedValue({
      kit: { agentId: 'broker-one' },
      created: true,
      savedStores: ['supabase', 'mongo'],
      publicUrl: 'https://broker-one.sunsetpulse.app',
      readiness: [],
      readyToPublish: false,
    });
    webhookMocks.suspendProvisionedAgentSite.mockResolvedValue({
      kit: { agentId: 'broker-one' },
      savedStores: ['supabase', 'mongo'],
      publicUrl: 'https://broker-one.sunsetpulse.app',
      readiness: [],
      readyToPublish: false,
    });
    webhookMocks.updateProvisionedAgentSiteBilling.mockImplementation(async (input) => ({
      kit: {
        agentId: input.agentId || 'broker-one',
        billingProfile: { billingStatus: input.billingStatus || 'unknown' },
      },
      savedStores: ['supabase', 'mongo'],
      publicUrl: 'https://broker-one.sunsetpulse.app',
      readiness: [],
      readyToPublish: false,
    }));
    webhookMocks.claimStripeWebhookEvent.mockResolvedValue({
      shouldProcess: true,
      eventId: 'evt_123',
      stores: ['supabase', 'mongo'],
    });
    webhookMocks.completeStripeWebhookEvent.mockResolvedValue(undefined);
    webhookMocks.failStripeWebhookEvent.mockResolvedValue(undefined);
  });

  it('provisions an agent site from a completed subscription checkout', async () => {
    webhookMocks.constructEvent.mockReturnValue(siteCheckoutEvent());

    const response = await POST(webhookRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.received).toBe(true);
    expect(webhookMocks.provisionPaidAgentSite).toHaveBeenCalledWith(expect.objectContaining({
      agentId: 'broker-one',
      userId: 'user-1',
      ownerName: 'Broker One',
      email: 'buyer@example.test',
      subscriptionTier: 'atlas',
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
      stripeCheckoutSessionId: 'cs_site_123',
      source: 'stripe-checkout',
    }));
    expect(webhookMocks.completeStripeWebhookEvent).toHaveBeenCalledWith('evt_123', ['supabase', 'mongo']);
  });

  it('skips duplicate Stripe events after the first ledger claim', async () => {
    webhookMocks.constructEvent.mockReturnValue(siteCheckoutEvent());
    webhookMocks.claimStripeWebhookEvent
      .mockResolvedValueOnce({
        shouldProcess: true,
        eventId: 'evt_123',
        stores: ['supabase', 'mongo'],
      })
      .mockResolvedValueOnce({
        shouldProcess: false,
        reason: 'duplicate_event',
        eventId: 'evt_123',
        stores: ['supabase', 'mongo'],
      });

    await POST(webhookRequest());
    const duplicateResponse = await POST(webhookRequest());
    const duplicateBody = await duplicateResponse.json();

    expect(webhookMocks.provisionPaidAgentSite).toHaveBeenCalledTimes(1);
    expect(webhookMocks.provisionPaidAgentSite.mock.calls.map((call) => call[0].stripeCheckoutSessionId)).toEqual([
      'cs_site_123',
    ]);
    expect(duplicateBody.data).toEqual(expect.objectContaining({
      received: true,
      ignored: 'duplicate_event',
      eventId: 'evt_123',
    }));
  });

  it('replays agent subscription lifecycle events while the ledger skips duplicates', async () => {
    webhookMocks.constructEvent
      .mockReturnValueOnce(subscriptionUpdatedEvent('evt_past_due', 'past_due'))
      .mockReturnValueOnce(subscriptionUpdatedEvent('evt_past_due', 'past_due'))
      .mockReturnValueOnce(subscriptionUpdatedEvent('evt_active', 'active'))
      .mockReturnValueOnce(subscriptionUpdatedEvent('evt_unpaid', 'unpaid'))
      .mockReturnValueOnce(subscriptionDeletedEvent('evt_deleted'));
    webhookMocks.claimStripeWebhookEvent
      .mockResolvedValueOnce({
        shouldProcess: true,
        eventId: 'evt_past_due',
        stores: ['supabase', 'mongo'],
      })
      .mockResolvedValueOnce({
        shouldProcess: false,
        reason: 'duplicate_event',
        eventId: 'evt_past_due',
        stores: ['supabase', 'mongo'],
      })
      .mockResolvedValueOnce({
        shouldProcess: true,
        eventId: 'evt_active',
        stores: ['supabase', 'mongo'],
      })
      .mockResolvedValueOnce({
        shouldProcess: true,
        eventId: 'evt_unpaid',
        stores: ['supabase', 'mongo'],
      })
      .mockResolvedValueOnce({
        shouldProcess: true,
        eventId: 'evt_deleted',
        stores: ['supabase', 'mongo'],
      });

    const responses = [
      await POST(webhookRequest()),
      await POST(webhookRequest()),
      await POST(webhookRequest()),
      await POST(webhookRequest()),
      await POST(webhookRequest()),
    ];
    const duplicateBody = await responses[1].json();

    expect(responses.map((response) => response.status)).toEqual([200, 200, 200, 200, 200]);
    expect(duplicateBody.data).toEqual(expect.objectContaining({
      received: true,
      ignored: 'duplicate_event',
      eventId: 'evt_past_due',
    }));
    expect(webhookMocks.updateProvisionedAgentSiteBilling.mock.calls.map((call) => call[0].billingStatus)).toEqual([
      'past_due',
      'active',
      'unpaid',
    ]);
    expect(webhookMocks.suspendProvisionedAgentSite).toHaveBeenCalledTimes(1);
    expect(webhookMocks.completeStripeWebhookEvent.mock.calls.map((call) => call[0])).toEqual([
      'evt_past_due',
      'evt_active',
      'evt_unpaid',
      'evt_deleted',
    ]);
    expect(webhookMocks.failStripeWebhookEvent).not.toHaveBeenCalled();
  });

  it('suspends an agent site when the Stripe subscription is deleted', async () => {
    webhookMocks.constructEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_123',
          customer: 'cus_123',
          metadata: {
            productType: 'agent_site',
            agentId: 'broker-one',
            userId: 'user-1',
          },
        },
      },
    });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(webhookMocks.suspendProvisionedAgentSite).toHaveBeenCalledWith(expect.objectContaining({
      agentId: 'broker-one',
      userId: 'user-1',
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
      source: 'stripe-subscription',
    }));
  });

  it('updates an agent site when Stripe subscription status changes', async () => {
    webhookMocks.constructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_123',
          customer: 'cus_123',
          status: 'past_due',
          trial_end: 1784227200,
          metadata: {
            productType: 'agent_site',
            agentId: 'broker-one',
            userId: 'user-1',
            subscriptionTier: 'atlas',
          },
        },
      },
    });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(webhookMocks.updateProvisionedAgentSiteBilling).toHaveBeenCalledWith(expect.objectContaining({
      agentId: 'broker-one',
      userId: 'user-1',
      subscriptionTier: 'atlas',
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
      billingStatus: 'past_due',
      trialEndsAt: '2026-07-16T18:40:00.000Z',
      source: 'stripe-subscription-updated',
    }));
  });

  it('maps terminal Stripe subscription updates to unpaid billing state', async () => {
    webhookMocks.constructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_123',
          customer: 'cus_123',
          status: 'incomplete_expired',
          metadata: {
            productType: 'agent_site',
            agentId: 'broker-one',
          },
        },
      },
    });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(webhookMocks.updateProvisionedAgentSiteBilling).toHaveBeenCalledWith(expect.objectContaining({
      billingStatus: 'unpaid',
    }));
  });

  it('does not provision sites for grill checkout metadata', async () => {
    webhookMocks.constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_grill_123',
          mode: 'payment',
          payment_status: 'paid',
          customer_email: 'food@example.test',
          metadata: {
            orderType: 'grill_food',
          },
        },
      },
    });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(webhookMocks.provisionPaidAgentSite).not.toHaveBeenCalled();
    expect(webhookMocks.userFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects webhook events that fail signature verification', async () => {
    webhookMocks.constructEvent.mockImplementation(() => {
      throw new Error('invalid signature');
    });

    const response = await POST(webhookRequest());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toContain('invalid signature');
    expect(webhookMocks.provisionPaidAgentSite).not.toHaveBeenCalled();
  });
});

function siteCheckoutEvent() {
  return {
    id: 'evt_123',
    type: 'checkout.session.completed',
    livemode: false,
    data: {
      object: {
        id: 'cs_site_123',
        mode: 'subscription',
        client_reference_id: 'user-1',
        customer: 'cus_123',
        subscription: 'sub_123',
        customer_email: 'buyer@example.test',
        metadata: {
          productType: 'agent_site',
          userId: 'user-1',
          agentId: 'broker-one',
          ownerName: 'Broker One',
          subscriptionTier: 'atlas',
        },
      },
    },
  };
}

function subscriptionUpdatedEvent(id: string, status: string) {
  return {
    id,
    type: 'customer.subscription.updated',
    livemode: false,
    data: {
      object: {
        id: 'sub_123',
        customer: 'cus_123',
        status,
        metadata: {
          productType: 'agent_site',
          agentId: 'broker-one',
          userId: 'user-1',
          subscriptionTier: 'atlas',
        },
      },
    },
  };
}

function subscriptionDeletedEvent(id: string) {
  return {
    id,
    type: 'customer.subscription.deleted',
    livemode: false,
    data: {
      object: {
        id: 'sub_123',
        customer: 'cus_123',
        metadata: {
          productType: 'agent_site',
          agentId: 'broker-one',
          userId: 'user-1',
          subscriptionTier: 'atlas',
        },
      },
    },
  };
}

function webhookRequest() {
  return new NextRequest('http://localhost/api/webhook/stripe', {
    method: 'POST',
    headers: { 'stripe-signature': 'sig_test_123' },
    body: JSON.stringify({ id: 'evt_123' }),
  });
}
