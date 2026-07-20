import { beforeEach, describe, expect, it, vi } from 'vitest';

const ledgerMocks = vi.hoisted(() => ({
  connectDB: vi.fn(),
  supabaseInserts: [] as any[],
  mongoCreates: [] as any[],
  supabaseAdmin: {
    from: vi.fn(),
  },
  StripeWebhookEvent: {
    findOne: vi.fn(),
    create: vi.fn(),
    updateOne: vi.fn(),
  },
}));

vi.mock('@/lib/core/database', () => ({
  default: ledgerMocks.connectDB,
}));

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: ledgerMocks.supabaseAdmin,
}));

vi.mock('@/models/StripeWebhookEvent', () => ({
  StripeWebhookEvent: ledgerMocks.StripeWebhookEvent,
}));

import { claimStripeWebhookEvent } from '@/lib/billing/stripeWebhookLedger';

describe('Stripe webhook ledger payload snapshots', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ledgerMocks.supabaseInserts.length = 0;
    ledgerMocks.mongoCreates.length = 0;
    ledgerMocks.connectDB.mockResolvedValue(undefined);
    ledgerMocks.StripeWebhookEvent.findOne.mockReturnValue({
      select: vi.fn(() => ({
        lean: vi.fn(async () => null),
      })),
    });
    ledgerMocks.StripeWebhookEvent.create.mockImplementation(async (payload) => {
      ledgerMocks.mongoCreates.push(payload);
      return payload;
    });
    ledgerMocks.supabaseAdmin.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: null, error: null })),
        })),
      })),
      insert: vi.fn(async (payload) => {
        ledgerMocks.supabaseInserts.push(payload);
        return { error: null };
      }),
    });
  });

  it('stores only buyer-safe fields from a Stripe payload snapshot', async () => {
    await claimStripeWebhookEvent({
      id: 'evt_snapshot',
      type: 'checkout.session.completed',
      livemode: false,
      created: 1784318400,
      data: {
        object: {
          id: 'cs_snapshot',
          object: 'checkout.session',
          customer: 'cus_snapshot',
          subscription: { id: 'sub_snapshot' },
          payment_intent: 'pi_snapshot',
          payment_status: 'paid',
          mode: 'subscription',
          customer_email: 'buyer@example.test',
          customer_details: {
            name: 'Jamie Buyer',
            address: { line1: '123 Main Street' },
          },
          metadata: {
            agentId: 'broker-one',
            ownerName: 'Jamie Buyer',
            productType: 'launch-kit',
            subscriptionTier: 'trial',
            secretNote: 'private buyer context',
          },
        },
      },
    } as any);

    const supabaseSnapshot = ledgerMocks.supabaseInserts[0].payload_snapshot;
    const mongoSnapshot = ledgerMocks.mongoCreates[0].payloadSnapshot;

    expect(supabaseSnapshot).toEqual(expect.objectContaining({
      objectType: 'checkout.session',
      objectId: 'cs_snapshot',
      customerId: 'cus_snapshot',
      subscriptionId: 'sub_snapshot',
      checkoutSessionId: 'cs_snapshot',
      paymentIntentId: 'pi_snapshot',
      paymentStatus: 'paid',
      mode: 'subscription',
      metadata: {
        agentId: 'broker-one',
        productType: 'launch-kit',
        subscriptionTier: 'trial',
      },
    }));
    expect(mongoSnapshot).toEqual(supabaseSnapshot);
    expect(JSON.stringify(supabaseSnapshot)).not.toContain('buyer@example.test');
    expect(JSON.stringify(supabaseSnapshot)).not.toContain('Jamie Buyer');
    expect(JSON.stringify(supabaseSnapshot)).not.toContain('123 Main Street');
    expect(JSON.stringify(supabaseSnapshot)).not.toContain('secretNote');
  });
});
