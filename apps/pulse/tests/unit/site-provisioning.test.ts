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
    expect(result.publicUrl).toContain(`${result.kit.subdomain}.sunsetpulse.app`);
    expect(storeMocks.saveSiteConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: result.kit.agentId,
        status: 'draft',
        subscriptionTier: 'atlas',
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
    expect(storeMocks.saveSiteConfig).toHaveBeenCalledWith(
      expect.objectContaining({ agentId: 'broker-one', status: 'suspended' }),
      expect.objectContaining({ role: 'stripe-webhook' }),
    );
  });
});
