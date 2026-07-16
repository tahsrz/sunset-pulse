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
    notifyStaffOfBurgerOrder: vi.fn(),
    dispatchPaidOrderPhoneRelay: vi.fn(),
    sendOrderConfirmationEmail: vi.fn(),
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

vi.mock('@/lib/sites/siteProvisioning', () => ({
  provisionPaidAgentSite: webhookMocks.provisionPaidAgentSite,
  suspendProvisionedAgentSite: webhookMocks.suspendProvisionedAgentSite,
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
  });

  it('keeps duplicate completed checkout events on the same provisioning key', async () => {
    webhookMocks.constructEvent.mockReturnValue(siteCheckoutEvent());

    await POST(webhookRequest());
    await POST(webhookRequest());

    expect(webhookMocks.provisionPaidAgentSite).toHaveBeenCalledTimes(2);
    expect(webhookMocks.provisionPaidAgentSite.mock.calls.map((call) => call[0].stripeCheckoutSessionId)).toEqual([
      'cs_site_123',
      'cs_site_123',
    ]);
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
    type: 'checkout.session.completed',
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

function webhookRequest() {
  return new NextRequest('http://localhost/api/webhook/stripe', {
    method: 'POST',
    headers: { 'stripe-signature': 'sig_test_123' },
    body: JSON.stringify({ id: 'evt_123' }),
  });
}
