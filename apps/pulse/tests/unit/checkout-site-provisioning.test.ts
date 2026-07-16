import { beforeEach, describe, expect, it, vi } from 'vitest';

const stripeMocks = vi.hoisted(() => ({
  checkoutSessionCreate: vi.fn(),
}));

vi.mock('stripe', () => {
  class StripeError extends Error {}

  return {
    default: Object.assign(
      vi.fn().mockImplementation(() => ({
        checkout: {
          sessions: {
            create: stripeMocks.checkoutSessionCreate,
          },
        },
      })),
      { errors: { StripeError } },
    ),
  };
});

vi.mock('@/lib/core/getSessionUser', () => ({
  getSessionUser: vi.fn().mockResolvedValue({
    userId: 'user-1',
    user: { email: 'buyer@example.test' },
  }),
}));

import { POST } from '@/app/api/checkout/route';

describe('site subscription checkout', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_DOMAIN = 'https://sunsetpulse.app';
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    stripeMocks.checkoutSessionCreate.mockReset();
    stripeMocks.checkoutSessionCreate.mockResolvedValue({
      id: 'cs_test_site',
      url: 'https://checkout.stripe.test/site',
    });
  });

  it('creates a subscription checkout session with agent-site provisioning metadata', async () => {
    const response = await POST(jsonRequest({
      agentId: 'Broker-One',
      ownerName: 'Broker One',
      subscriptionTier: 'atlas',
    }) as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.url).toBe('https://checkout.stripe.test/site');
    expect(stripeMocks.checkoutSessionCreate).toHaveBeenCalledTimes(1);

    const params = stripeMocks.checkoutSessionCreate.mock.calls[0][0];
    expect(params.mode).toBe('subscription');
    expect(params.client_reference_id).toBe('user-1');
    expect(params.success_url).toBe('https://sunsetpulse.app/onboarding/site?session_id={CHECKOUT_SESSION_ID}');
    expect(params.subscription_data.trial_period_days).toBe(90);
    expect(params.metadata).toEqual(expect.objectContaining({
      productType: 'agent_site',
      userId: 'user-1',
      agentId: 'broker-one',
      ownerName: 'Broker One',
      subscriptionTier: 'atlas',
    }));
    expect(params.subscription_data.metadata).toEqual(params.metadata);
  });
});

function jsonRequest(body: unknown) {
  return new Request('http://localhost/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
