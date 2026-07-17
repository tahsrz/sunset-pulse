import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const stripeMocks = vi.hoisted(() => ({
  checkoutSessionCreate: vi.fn(),
}));
const siteStoreMocks = vi.hoisted(() => ({
  savedKit: null as any,
  readSiteConfig: vi.fn(),
  readSiteConfigByOwnerUser: vi.fn(),
  readExpiredPastDueSiteConfigs: vi.fn(),
  saveSiteConfig: vi.fn(),
  notifyBuyerSiteProvisioned: vi.fn(),
  notifyBuyerSiteBillingUpdate: vi.fn(),
  notifyBuyerSiteGraceExpired: vi.fn(),
  notifyOperatorSiteBillingUpdate: vi.fn(),
  notifyOperatorSiteGraceExpired: vi.fn(),
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

vi.mock('@/lib/sites/siteConfigStore', () => ({
  readSiteConfig: siteStoreMocks.readSiteConfig,
  readSiteConfigByOwnerUser: siteStoreMocks.readSiteConfigByOwnerUser,
  readExpiredPastDueSiteConfigs: siteStoreMocks.readExpiredPastDueSiteConfigs,
  saveSiteConfig: siteStoreMocks.saveSiteConfig,
}));

vi.mock('@/lib/sites/siteLifecycleNotifications', () => ({
  notifyBuyerSiteProvisioned: siteStoreMocks.notifyBuyerSiteProvisioned,
  notifyBuyerSiteBillingUpdate: siteStoreMocks.notifyBuyerSiteBillingUpdate,
  notifyBuyerSiteGraceExpired: siteStoreMocks.notifyBuyerSiteGraceExpired,
  notifyOperatorSiteBillingUpdate: siteStoreMocks.notifyOperatorSiteBillingUpdate,
  notifyOperatorSiteGraceExpired: siteStoreMocks.notifyOperatorSiteGraceExpired,
}));

import { POST } from '@/app/api/checkout/route';
import { GET as getMySite } from '@/app/api/onboarding/my-site/route';
import { provisionPaidAgentSite } from '@/lib/sites/siteProvisioning';

describe('site subscription checkout', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_DOMAIN = 'https://sunsetpulse.app';
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    stripeMocks.checkoutSessionCreate.mockReset();
    stripeMocks.checkoutSessionCreate.mockResolvedValue({
      id: 'cs_test_site',
      url: 'https://checkout.stripe.test/site',
    });
    siteStoreMocks.savedKit = null;
    siteStoreMocks.readSiteConfig.mockReset().mockResolvedValue(null);
    siteStoreMocks.readSiteConfigByOwnerUser.mockReset().mockImplementation(async () => siteStoreMocks.savedKit);
    siteStoreMocks.readExpiredPastDueSiteConfigs.mockReset().mockResolvedValue([]);
    siteStoreMocks.saveSiteConfig.mockReset().mockImplementation(async (kit) => {
      siteStoreMocks.savedKit = kit;
      return ['supabase', 'mongo'];
    });
    siteStoreMocks.notifyBuyerSiteProvisioned.mockReset().mockResolvedValue({ status: 'skipped', reason: 'test', recipients: [] });
    siteStoreMocks.notifyBuyerSiteBillingUpdate.mockReset().mockResolvedValue({ status: 'skipped', reason: 'test', recipients: [] });
    siteStoreMocks.notifyBuyerSiteGraceExpired.mockReset().mockResolvedValue({ status: 'skipped', reason: 'test', recipients: [] });
    siteStoreMocks.notifyOperatorSiteBillingUpdate.mockReset().mockResolvedValue({ status: 'skipped', reason: 'test', recipients: [] });
    siteStoreMocks.notifyOperatorSiteGraceExpired.mockReset().mockResolvedValue({ status: 'skipped', reason: 'test', recipients: [] });
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

  it('carries a buyer from checkout metadata to provisioned onboarding site state', async () => {
    const checkoutResponse = await POST(jsonRequest({
      agentId: 'Broker-One',
      ownerName: 'Broker One',
      subscriptionTier: 'atlas',
    }) as any);
    expect(checkoutResponse.status).toBe(200);

    const params = stripeMocks.checkoutSessionCreate.mock.calls[0][0];
    const provisioned = await provisionPaidAgentSite({
      agentId: params.metadata.agentId,
      userId: params.metadata.userId,
      ownerName: params.metadata.ownerName,
      email: 'buyer@example.test',
      subscriptionTier: params.metadata.subscriptionTier,
      stripeCustomerId: 'cus_site_123',
      stripeSubscriptionId: 'sub_site_123',
      stripeCheckoutSessionId: 'cs_test_site',
      billingStatus: 'trialing',
      trialEndsAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      source: 'stripe-checkout',
    });

    expect(provisioned.created).toBe(true);
    expect(siteStoreMocks.saveSiteConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: 'broker-one',
        ownerId: 'user-1',
        billingProfile: expect.objectContaining({
          userId: 'user-1',
          billingStatus: 'trialing',
          stripeCheckoutSessionId: 'cs_test_site',
        }),
      }),
      expect.objectContaining({ role: 'stripe-checkout', email: 'buyer@example.test' }),
    );

    const mySiteResponse = await getMySite(new NextRequest('http://localhost/api/onboarding/my-site'));
    const mySiteBody = await mySiteResponse.json();

    expect(mySiteResponse.status).toBe(200);
    expect(mySiteBody.data.site).toEqual(expect.objectContaining({
      setupUrl: '/onboarding/site/setup?session_id=cs_test_site',
      reviewStatus: 'not_started',
      billingStatus: 'trialing',
      publicUrl: expect.stringContaining('broker-one.sunsetpulse.app'),
    }));
    expect(mySiteBody.data.site.trialEndsAt).toEqual(expect.any(String));
  });
});

function jsonRequest(body: unknown) {
  return new Request('http://localhost/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
