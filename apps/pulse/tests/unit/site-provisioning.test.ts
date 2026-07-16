import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultLaunchKit } from '@/lib/sites/launchKit';

const storeMocks = vi.hoisted(() => ({
  readSiteConfig: vi.fn(),
  saveSiteConfig: vi.fn(),
}));

vi.mock('@/lib/sites/siteConfigStore', () => ({
  readSiteConfig: storeMocks.readSiteConfig,
  saveSiteConfig: storeMocks.saveSiteConfig,
}));

import {
  provisionPaidAgentSite,
  resolveProvisionedAgentId,
  suspendProvisionedAgentSite,
  updateProvisionedAgentSiteBilling,
} from '@/lib/sites/siteProvisioning';

describe('site provisioning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeMocks.readSiteConfig.mockResolvedValue(null);
    storeMocks.saveSiteConfig.mockResolvedValue(['supabase', 'mongo']);
  });

  it('creates a draft launch kit from paid Stripe checkout metadata', async () => {
    const result = await provisionPaidAgentSite({
      userId: 'user_123',
      ownerName: 'Mina Patel',
      email: 'mina@example.test',
      subscriptionTier: 'atlas',
      stripeCheckoutSessionId: 'cs_test_123',
    });

    expect(result.created).toBe(true);
    expect(result.kit.agentId).toMatch(/^mina-patel-[a-f0-9]{8}$/);
    expect(result.kit.status).toBe('draft');
    expect(result.kit.subscriptionTier).toBe('atlas');
    expect(result.kit.agentProfile.displayName).toBe('Mina Patel');
    expect(result.kit.integrationProfile.leadEmail).toBe('mina@example.test');
    expect(result.kit.provisioningAudit[0]).toEqual(expect.objectContaining({
      action: 'checkout.session.completed',
      source: 'stripe-webhook',
      status: 'succeeded',
      stripeCheckoutSessionId: 'cs_test_123',
      billingStatus: 'trialing',
      siteStatus: 'draft',
    }));
    expect(result.publicUrl).toContain(`${result.kit.subdomain}.sunsetpulse.app`);
    expect(storeMocks.saveSiteConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: result.kit.agentId,
        status: 'draft',
        subscriptionTier: 'atlas',
        provisioningAudit: expect.arrayContaining([
          expect.objectContaining({ action: 'checkout.session.completed' }),
        ]),
      }),
      expect.objectContaining({ role: 'stripe-webhook', email: 'mina@example.test' }),
    );
  });

  it('uses explicit agent ids without adding a hash suffix', async () => {
    expect(resolveProvisionedAgentId({
      agentId: 'Broker-One',
      email: 'broker@example.test',
    })).toBe('broker-one');
  });

  it('refreshes an existing site without overwriting custom identity fields', async () => {
    const existing = {
      ...createDefaultLaunchKit('broker-one'),
      ownerName: 'Existing Owner',
      branding: {
        ...createDefaultLaunchKit('broker-one').branding,
        siteName: 'Existing Brand',
      },
      agentProfile: {
        ...createDefaultLaunchKit('broker-one').agentProfile,
        displayName: 'Existing Agent',
        email: 'existing@example.test',
      },
      integrationProfile: {
        ...createDefaultLaunchKit('broker-one').integrationProfile,
        leadEmail: 'leads@example.test',
      },
    };
    storeMocks.readSiteConfig.mockResolvedValue(existing);

    const result = await provisionPaidAgentSite({
      agentId: 'broker-one',
      ownerName: 'Stripe Buyer',
      email: 'buyer@example.test',
    });

    expect(result.created).toBe(false);
    expect(result.kit.ownerName).toBe('Existing Owner');
    expect(result.kit.branding.siteName).toBe('Existing Brand');
    expect(result.kit.agentProfile.displayName).toBe('Existing Agent');
    expect(result.kit.agentProfile.email).toBe('existing@example.test');
    expect(result.kit.integrationProfile.leadEmail).toBe('leads@example.test');
  });

  it('suspends an existing provisioned site when the subscription ends', async () => {
    storeMocks.readSiteConfig.mockResolvedValue(createDefaultLaunchKit('broker-one'));

    const result = await suspendProvisionedAgentSite({
      agentId: 'broker-one',
      stripeSubscriptionId: 'sub_123',
    });

    expect(result?.kit.status).toBe('suspended');
    expect(result?.kit.provisioningAudit[0]).toEqual(expect.objectContaining({
      action: 'customer.subscription.deleted',
      billingStatus: 'canceled',
      siteStatus: 'suspended',
    }));
    expect(storeMocks.saveSiteConfig).toHaveBeenCalledWith(
      expect.objectContaining({ agentId: 'broker-one', status: 'suspended' }),
      expect.objectContaining({ role: 'stripe-webhook' }),
    );
  });

  it('moves a past-due site back to draft billing state', async () => {
    storeMocks.readSiteConfig.mockResolvedValue({
      ...createReadyApprovedKit('broker-one'),
      status: 'active',
    });

    const result = await updateProvisionedAgentSiteBilling({
      agentId: 'broker-one',
      stripeSubscriptionId: 'sub_123',
      billingStatus: 'past_due',
      source: 'stripe-subscription-updated',
    });

    expect(result?.kit.status).toBe('draft');
    expect(result?.kit.billingProfile.billingStatus).toBe('past_due');
    expect(result?.kit.provisioningAudit[0]).toEqual(expect.objectContaining({
      action: 'customer.subscription.updated',
      billingStatus: 'past_due',
      siteStatus: 'draft',
    }));
    expect(result?.readyToPublish).toBe(false);
    expect(storeMocks.saveSiteConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: 'broker-one',
        status: 'draft',
        billingProfile: expect.objectContaining({ billingStatus: 'past_due' }),
      }),
      expect.objectContaining({ role: 'stripe-subscription-updated' }),
    );
  });

  it('reactivates an approved ready site when subscription billing recovers', async () => {
    storeMocks.readSiteConfig.mockResolvedValue({
      ...createReadyApprovedKit('broker-one'),
      status: 'draft',
      billingProfile: {
        billingStatus: 'past_due',
        stripeSubscriptionId: 'sub_123',
      },
    });

    const result = await updateProvisionedAgentSiteBilling({
      agentId: 'broker-one',
      stripeSubscriptionId: 'sub_123',
      billingStatus: 'active',
      source: 'stripe-subscription-updated',
    });

    expect(result?.kit.status).toBe('active');
    expect(result?.kit.billingProfile.billingStatus).toBe('active');
    expect(result?.readyToPublish).toBe(true);
  });
});

function createReadyApprovedKit(agentId: string) {
  const kit = createDefaultLaunchKit(agentId);

  return {
    ...kit,
    agentProfile: {
      ...kit.agentProfile,
      email: 'agent@example.test',
    },
    integrationProfile: {
      ...kit.integrationProfile,
      leadEmail: 'leads@example.test',
      hotListMlsIds: ['NTREIS-1'],
    },
    billingProfile: {
      billingStatus: 'active',
      stripeSubscriptionId: 'sub_123',
    },
    reviewProfile: {
      status: 'approved',
    },
  };
}
