import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const webhookMocks = vi.hoisted(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_123';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';

  return {
    constructEvent: vi.fn(),
    checkoutSessionsRetrieve: vi.fn(),
    headersGet: vi.fn(() => 'sig_test_123'),
    connectDB: vi.fn(),
    userFindOneAndUpdate: vi.fn(),
    orderFindById: vi.fn(),
    orderFindOneAndUpdate: vi.fn(),
    orderFindByIdAndUpdate: vi.fn(),
    readSiteConfigByStripeSubscriptionId: vi.fn(),
    provisionPaidAgentSite: vi.fn(),
    suspendProvisionedAgentSite: vi.fn(),
    updateProvisionedAgentSiteBilling: vi.fn(),
    notifyStaffOfBurgerOrder: vi.fn(),
    dispatchPaidOrderPhoneRelay: vi.fn(),
    sendOrderConfirmationEmail: vi.fn(),
    claimStripeWebhookEvent: vi.fn(),
    completeStripeWebhookEvent: vi.fn(),
    failStripeWebhookEvent: vi.fn(),
    notifyOperatorStripeWebhookFailure: vi.fn(),
  };
});

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: webhookMocks.constructEvent,
    },
    checkout: {
      sessions: {
        retrieve: webhookMocks.checkoutSessionsRetrieve,
      },
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
    findOneAndUpdate: webhookMocks.orderFindOneAndUpdate,
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

vi.mock('@/lib/sites/siteConfigStore', () => ({
  readSiteConfigByStripeSubscriptionId: webhookMocks.readSiteConfigByStripeSubscriptionId,
}));

vi.mock('@/lib/sites/siteProvisioning', () => ({
  provisionPaidAgentSite: webhookMocks.provisionPaidAgentSite,
  suspendProvisionedAgentSite: webhookMocks.suspendProvisionedAgentSite,
  updateProvisionedAgentSiteBilling: webhookMocks.updateProvisionedAgentSiteBilling,
}));

vi.mock('@/lib/sites/siteLifecycleNotifications', () => ({
  notifyOperatorStripeWebhookFailure: webhookMocks.notifyOperatorStripeWebhookFailure,
}));

import { POST } from '@/app/api/webhook/stripe/route';

describe('Stripe webhook site provisioning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    webhookMocks.headersGet.mockReturnValue('sig_test_123');
    webhookMocks.connectDB.mockResolvedValue(undefined);
    webhookMocks.checkoutSessionsRetrieve.mockImplementation(async (id) => expandedSiteCheckoutSession(id));
    webhookMocks.userFindOneAndUpdate.mockResolvedValue({});
    webhookMocks.orderFindById.mockResolvedValue(null);
    webhookMocks.orderFindOneAndUpdate.mockResolvedValue(null);
    webhookMocks.orderFindByIdAndUpdate.mockResolvedValue({});
    webhookMocks.readSiteConfigByStripeSubscriptionId.mockResolvedValue(null);
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
    webhookMocks.notifyOperatorStripeWebhookFailure.mockResolvedValue({ status: 'skipped', reason: 'test', recipients: [] });
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
      billingStatus: 'trialing',
      trialEndsAt: '2026-10-21T12:00:00.000Z',
      source: 'stripe-checkout',
    }));
    expect(webhookMocks.userFindOneAndUpdate).not.toHaveBeenCalled();
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

  it('updates an agent site by stored subscription id when Stripe metadata is missing', async () => {
    webhookMocks.constructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_123',
          customer: 'cus_123',
          status: 'active',
          metadata: {},
        },
      },
    });
    webhookMocks.readSiteConfigByStripeSubscriptionId.mockResolvedValue({
      agent_id: 'broker-one',
      owner_id: 'user-1',
      owner_name: 'Broker One',
      subscription_tier: 'atlas',
      billing_profile: {
        userId: 'user-1',
        stripeSubscriptionId: 'sub_123',
      },
      updated_at: '2026-07-23T12:00:00.000Z',
    });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(webhookMocks.updateProvisionedAgentSiteBilling).toHaveBeenCalledWith(expect.objectContaining({
      agentId: 'broker-one',
      userId: 'user-1',
      ownerName: 'Broker One',
      subscriptionTier: 'atlas',
      stripeSubscriptionId: 'sub_123',
      billingStatus: 'active',
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

  it('alerts operators when a claimed Stripe webhook fails processing', async () => {
    const processingError = new Error('database unavailable');
    webhookMocks.constructEvent.mockReturnValue(subscriptionDeletedEvent('evt_deleted'));
    webhookMocks.claimStripeWebhookEvent.mockResolvedValue({
      shouldProcess: true,
      eventId: 'evt_deleted',
      stores: ['supabase'],
    });
    webhookMocks.connectDB.mockRejectedValue(processingError);

    const response = await POST(webhookRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe('Stripe webhook processing failed.');
    expect(webhookMocks.failStripeWebhookEvent).toHaveBeenCalledWith('evt_deleted', ['supabase'], processingError);
    expect(webhookMocks.notifyOperatorStripeWebhookFailure).toHaveBeenCalledWith(expect.objectContaining({
      eventId: 'evt_deleted',
      eventType: 'customer.subscription.deleted',
      objectId: 'sub_123',
      livemode: false,
      stores: ['supabase'],
      error: processingError,
    }));
  });

  it('fails and alerts when subscription billing update rejects a claimed event', async () => {
    const billingError = new Error('site store unavailable');
    webhookMocks.constructEvent.mockReturnValue(subscriptionUpdatedEvent('evt_update_failed', 'past_due'));
    webhookMocks.claimStripeWebhookEvent.mockResolvedValue({
      shouldProcess: true,
      eventId: 'evt_update_failed',
      stores: ['supabase'],
    });
    webhookMocks.updateProvisionedAgentSiteBilling.mockRejectedValue(billingError);

    const response = await POST(webhookRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe('Stripe webhook processing failed.');
    expect(webhookMocks.failStripeWebhookEvent).toHaveBeenCalledWith('evt_update_failed', ['supabase'], billingError);
    expect(webhookMocks.completeStripeWebhookEvent).not.toHaveBeenCalled();
    expect(webhookMocks.notifyOperatorStripeWebhookFailure).toHaveBeenCalledWith(expect.objectContaining({
      eventId: 'evt_update_failed',
      eventType: 'customer.subscription.updated',
      error: billingError,
    }));
  });

  it('fails and alerts when subscription suspension finds no matching site', async () => {
    webhookMocks.constructEvent.mockReturnValue(subscriptionDeletedEvent('evt_suspend_missing'));
    webhookMocks.claimStripeWebhookEvent.mockResolvedValue({
      shouldProcess: true,
      eventId: 'evt_suspend_missing',
      stores: ['mongo'],
    });
    webhookMocks.suspendProvisionedAgentSite.mockResolvedValue(null);

    const response = await POST(webhookRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe('Stripe webhook processing failed.');
    expect(webhookMocks.failStripeWebhookEvent).toHaveBeenCalledWith('evt_suspend_missing', ['mongo'], expect.any(Error));
    expect(webhookMocks.completeStripeWebhookEvent).not.toHaveBeenCalled();
    expect(webhookMocks.notifyOperatorStripeWebhookFailure).toHaveBeenCalledWith(expect.objectContaining({
      eventId: 'evt_suspend_missing',
      eventType: 'customer.subscription.deleted',
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

  it('marks grill orders paid atomically before sending notifications', async () => {
    const order = {
      _id: 'order_123',
      scheduledTime: null,
      emailConfirmation: {},
    };
    webhookMocks.constructEvent.mockReturnValue(grillCheckoutEvent());
    webhookMocks.orderFindOneAndUpdate.mockResolvedValue(order);
    webhookMocks.sendOrderConfirmationEmail.mockResolvedValue({ success: true, id: 'email_123' });
    webhookMocks.notifyStaffOfBurgerOrder.mockResolvedValue(undefined);
    webhookMocks.dispatchPaidOrderPhoneRelay.mockResolvedValue({ success: true });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(webhookMocks.orderFindOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: 'order_123',
        isPaid: { $ne: true },
        paymentState: { $nin: ['PAID_STRIPE', 'PAID_POS'] },
      },
      expect.objectContaining({
        isPaid: true,
        paymentState: 'PAID_STRIPE',
        paymentSessionId: 'cs_grill_123',
        customerEmail: 'food@example.test',
      }),
      { new: true },
    );
    expect(webhookMocks.notifyStaffOfBurgerOrder).toHaveBeenCalledTimes(1);
  });

  it('skips grill notifications when the atomic paid update does not claim the order', async () => {
    webhookMocks.constructEvent.mockReturnValue(grillCheckoutEvent());
    webhookMocks.orderFindOneAndUpdate.mockResolvedValue(null);
    webhookMocks.orderFindById.mockResolvedValue({
      _id: 'order_123',
      isPaid: true,
      paymentState: 'PAID_STRIPE',
    });

    const response = await POST(webhookRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.ignored).toBe('already_paid');
    expect(webhookMocks.notifyStaffOfBurgerOrder).not.toHaveBeenCalled();
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

  it('fails and alerts when agent-site provisioning rejects a claimed event', async () => {
    const provisioningError = new Error('Stripe checkout user does not own the existing agent site.');
    webhookMocks.constructEvent.mockReturnValue(siteCheckoutEvent('evt_owner_mismatch'));
    webhookMocks.claimStripeWebhookEvent.mockResolvedValue({
      shouldProcess: true,
      eventId: 'evt_owner_mismatch',
      stores: ['supabase'],
    });
    webhookMocks.provisionPaidAgentSite.mockRejectedValue(provisioningError);

    const response = await POST(webhookRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe('Stripe webhook processing failed.');
    expect(webhookMocks.failStripeWebhookEvent).toHaveBeenCalledWith('evt_owner_mismatch', ['supabase'], provisioningError);
    expect(webhookMocks.completeStripeWebhookEvent).not.toHaveBeenCalled();
    expect(webhookMocks.notifyOperatorStripeWebhookFailure).toHaveBeenCalledWith(expect.objectContaining({
      eventId: 'evt_owner_mismatch',
      eventType: 'checkout.session.completed',
      error: provisioningError,
    }));
  });
});

function siteCheckoutEvent(id = 'evt_123') {
  return {
    id,
    type: 'checkout.session.completed',
    livemode: false,
    data: {
      object: {
        id: 'cs_site_123',
        mode: 'subscription',
        payment_status: 'no_payment_required',
        created: 1784808000,
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

function expandedSiteCheckoutSession(id = 'cs_site_123') {
  return {
    id,
    mode: 'subscription',
    payment_status: 'no_payment_required',
    created: 1784808000,
    client_reference_id: 'user-1',
    customer: 'cus_123',
    subscription: {
      id: 'sub_123',
      status: 'trialing',
      trial_end: 1792584000,
    },
    customer_email: 'buyer@example.test',
    metadata: {
      productType: 'agent_site',
      userId: 'user-1',
      agentId: 'broker-one',
      ownerName: 'Broker One',
      subscriptionTier: 'atlas',
    },
  };
}

function grillCheckoutEvent() {
  return {
    id: 'evt_grill_123',
    type: 'checkout.session.completed',
    livemode: false,
    data: {
      object: {
        id: 'cs_grill_123',
        mode: 'payment',
        payment_status: 'paid',
        customer_email: 'food@example.test',
        metadata: {
          orderType: 'grill_food',
          orderId: 'order_123',
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
