import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createDefaultLaunchKit } from '@/lib/sites/launchKit';

const onboardingMocks = vi.hoisted(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_123';

  return {
    retrieveSession: vi.fn(),
    getSessionUser: vi.fn(),
    readSiteConfig: vi.fn(),
    saveSiteConfig: vi.fn(),
    provisionPaidAgentSite: vi.fn(),
  };
});

vi.mock('stripe', () => {
  class StripeError extends Error {}

  return {
    default: Object.assign(
      vi.fn().mockImplementation(() => ({
        checkout: {
          sessions: {
            retrieve: onboardingMocks.retrieveSession,
          },
        },
      })),
      { errors: { StripeError } },
    ),
  };
});

vi.mock('@/lib/core/getSessionUser', () => ({
  getSessionUser: onboardingMocks.getSessionUser,
}));

vi.mock('@/lib/sites/siteConfigStore', () => ({
  readSiteConfig: onboardingMocks.readSiteConfig,
  saveSiteConfig: onboardingMocks.saveSiteConfig,
}));

vi.mock('@/lib/sites/siteProvisioning', async () => {
  const actual = await vi.importActual<typeof import('@/lib/sites/siteProvisioning')>('@/lib/sites/siteProvisioning');

  return {
    ...actual,
    provisionPaidAgentSite: onboardingMocks.provisionPaidAgentSite,
  };
});

import { GET, PUT } from '@/app/api/onboarding/site/route';

describe('site onboarding route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onboardingMocks.getSessionUser.mockResolvedValue({
      userId: 'user-1',
      user: {
        email: 'buyer@example.test',
        name: 'Buyer One',
      },
    });
    onboardingMocks.retrieveSession.mockResolvedValue({
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
        subscriptionTier: 'atlas',
      },
    });
    onboardingMocks.readSiteConfig.mockResolvedValue({
      ...createDefaultLaunchKit('broker-one'),
      subscriptionTier: 'atlas',
      integrationProfile: {
        ...createDefaultLaunchKit('broker-one').integrationProfile,
        hotListMlsIds: ['MLS-1'],
      },
    });
    onboardingMocks.saveSiteConfig.mockResolvedValue(['supabase', 'mongo']);
  });

  it('returns a buyer-safe setup URL instead of the admin Launch Kit', async () => {
    const response = await GET(request('http://localhost/api/onboarding/site?session_id=cs_site_123'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(onboardingMocks.retrieveSession).toHaveBeenCalledWith('cs_site_123', {
      expand: ['subscription'],
    });
    expect(body.data.setupUrl).toBe('/onboarding/site/setup?session_id=cs_site_123');
    expect(body.data.setupUrl).not.toContain('/admin/');
  });

  it('verifies the 90-day Stripe trial from the expanded checkout subscription', async () => {
    const created = 1784235600;
    const trialEnd = created + 90 * 24 * 60 * 60;
    onboardingMocks.readSiteConfig.mockResolvedValue(null);
    onboardingMocks.retrieveSession.mockResolvedValue({
      id: 'cs_site_123',
      mode: 'subscription',
      created,
      payment_status: 'no_payment_required',
      client_reference_id: 'user-1',
      customer: 'cus_123',
      subscription: {
        id: 'sub_123',
        status: 'trialing',
        trial_end: trialEnd,
      },
      customer_email: 'buyer@example.test',
      metadata: {
        productType: 'agent_site',
        userId: 'user-1',
        agentId: 'broker-one',
        subscriptionTier: 'atlas',
      },
    });
    onboardingMocks.provisionPaidAgentSite.mockResolvedValue({
      ...mockSummary(createDefaultLaunchKit('broker-one')),
      created: true,
      savedStores: ['supabase', 'mongo'],
    });

    const response = await GET(request('http://localhost/api/onboarding/site?session_id=cs_site_123'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.buyerStatus.trial).toEqual(expect.objectContaining({
      verified: true,
      daysExpected: 90,
      daysObserved: 90,
      endsAt: new Date(trialEnd * 1000).toISOString(),
    }));
    expect(body.data.buyerStatus.payment).toEqual(expect.objectContaining({
      state: 'received',
      stripePaymentStatus: 'no_payment_required',
    }));
    expect(onboardingMocks.provisionPaidAgentSite).toHaveBeenCalledWith(expect.objectContaining({
      billingStatus: 'trialing',
      trialEndsAt: new Date(trialEnd * 1000).toISOString(),
      stripeSubscriptionId: 'sub_123',
    }));
  });

  it('reconciles a launch kit when the Stripe webhook has not written it yet', async () => {
    onboardingMocks.readSiteConfig.mockResolvedValue(null);
    onboardingMocks.provisionPaidAgentSite.mockResolvedValue({
      ...mockSummary(createDefaultLaunchKit('broker-one')),
      created: true,
      savedStores: ['supabase', 'mongo'],
    });

    const response = await GET(request('http://localhost/api/onboarding/site?session_id=cs_site_123'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.status).toBe('reconciled');
    expect(body.data.setupUrl).toBe('/onboarding/site/setup?session_id=cs_site_123');
    expect(onboardingMocks.provisionPaidAgentSite).toHaveBeenCalledWith(expect.objectContaining({
      agentId: 'broker-one',
      userId: 'user-1',
      email: 'buyer@example.test',
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
      stripeCheckoutSessionId: 'cs_site_123',
      source: 'checkout-onboarding',
    }));
  });

  it('saves only buyer-safe setup fields and preserves protected site controls', async () => {
    const response = await PUT(request('http://localhost/api/onboarding/site?session_id=cs_site_123', {
      method: 'PUT',
      body: {
        ownerName: 'Buyer One',
        status: 'active',
        subscriptionTier: 'enterprise',
        subdomain: 'takeover',
        branding: {
          siteName: 'Buyer One Homes',
          primaryColor: '#0f766e',
          fontFamily: 'Inter',
        },
        hero: {
          title: 'Buyer One local search',
          subtitle: 'Homes, context, and fast follow-up.',
          backgroundImage: '',
        },
        agentProfile: {
          displayName: 'Buyer One',
          brokerageName: 'One Realty',
          licenseNumber: 'TX-123',
          phone: '555-0100',
          email: 'buyer@example.test',
          markets: ['Dallas', 'Fort Worth'],
          headshotUrl: '',
          officeAddress: '100 Main St',
        },
        complianceProfile: {
          jurisdiction: 'Texas',
          footerDisclaimer: 'Information is deemed reliable but not guaranteed.',
          mlsDisclaimer: 'MLS data should be independently verified.',
          equalHousing: true,
        },
        integrationProfile: {
          leadEmail: 'leads@example.test',
          calendarUrl: '',
          crmTag: 'buyer-site',
          hotListMlsIds: ['SHOULD-NOT-SAVE'],
        },
      },
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.savedStores).toEqual(['supabase', 'mongo']);
    expect(onboardingMocks.saveSiteConfig).toHaveBeenCalledTimes(1);

    const savedKit = onboardingMocks.saveSiteConfig.mock.calls[0][0];
    expect(savedKit.agentId).toBe('broker-one');
    expect(savedKit.subdomain).toBe('broker-one');
    expect(savedKit.status).toBe('draft');
    expect(savedKit.subscriptionTier).toBe('atlas');
    expect(savedKit.integrationProfile.hotListMlsIds).toEqual(['MLS-1']);
    expect(savedKit.branding.siteName).toBe('Buyer One Homes');
    expect(savedKit.integrationProfile.leadEmail).toBe('leads@example.test');
  });
});

function request(url: string, init: { method?: string; body?: unknown } = {}) {
  return new NextRequest(url, {
    method: init.method || 'GET',
    headers: init.body ? { 'Content-Type': 'application/json' } : undefined,
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
}

function mockSummary(kit: ReturnType<typeof createDefaultLaunchKit>) {
  return {
    kit,
    publicUrl: `https://${kit.subdomain}.sunsetpulse.app`,
    readiness: [],
    readyToPublish: false,
    publishGate: {
      allowed: false,
      checks: [],
    },
  };
}
