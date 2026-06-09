import { beforeEach, describe, expect, it, vi } from 'vitest';

const stripeMocks = vi.hoisted(() => ({
  checkoutSessionCreate: vi.fn(),
  couponCreate: vi.fn(),
}));

const orderState = vi.hoisted(() => ({
  order: {
    _id: '665a00000000000000000001',
    isPaid: false,
    paymentState: 'UNPAID',
    items: [
      {
        name: 'Cheeseburger Basket',
        price: 10.59,
        quantity: 1,
      },
    ],
    discountAmount: 0,
    totalAmount: 10.59,
  },
}));

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: stripeMocks.checkoutSessionCreate,
      },
    },
    coupons: {
      create: stripeMocks.couponCreate,
    },
  })),
}));

vi.mock('@/lib/core/database', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/core/getSessionUser', () => ({
  getSessionUser: vi.fn().mockResolvedValue({
    userId: 'user-1',
    user: { email: 'customer@example.com' },
  }),
}));

vi.mock('@/models/Order', () => ({
  default: {
    findById: vi.fn(() => ({
      lean: vi.fn().mockResolvedValue(orderState.order),
    })),
  },
}));

import { POST } from '@/app/api/checkout/grill/route';

function jsonRequest(body: unknown) {
  return new Request('http://localhost/api/checkout/grill', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('grill Stripe Checkout session', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_DOMAIN = 'https://sunsetpulse.app';
    stripeMocks.checkoutSessionCreate.mockReset();
    stripeMocks.checkoutSessionCreate.mockResolvedValue({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.test/session',
    });
    stripeMocks.couponCreate.mockReset();
  });

  it('lets Stripe Checkout use dashboard-enabled payment methods', async () => {
    const response = await POST(jsonRequest({
      orderId: '665a00000000000000000001',
    }) as any);

    expect(response.status).toBe(200);
    expect(stripeMocks.checkoutSessionCreate).toHaveBeenCalledTimes(1);

    const sessionParams = stripeMocks.checkoutSessionCreate.mock.calls[0][0];
    expect(sessionParams).not.toHaveProperty('automatic_payment_methods');
    expect(sessionParams).not.toHaveProperty('payment_method_types');
    expect(sessionParams.mode).toBe('payment');
    expect(sessionParams.success_url).toContain('/grill/tracker/665a00000000000000000001');
  });
});
