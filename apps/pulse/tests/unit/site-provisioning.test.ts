import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultLaunchKit } from '@/lib/sites/launchKit';

const storeMocks = vi.hoisted(() => ({
  readSiteConfig: vi.fn(),
  readExpiredPastDueSiteConfigs: vi.fn(),
  claimPastDueSiteConfigForExpiry: vi.fn(),
  saveSiteConfig: vi.fn(),
  notifyBuyerSiteProvisioned: vi.fn(),
  notifyBuyerSiteBillingUpdate: vi.fn(),
  notifyBuyerSiteGraceExpired: vi.fn(),
  notifyOperatorSiteBillingUpdate: vi.fn(),
  notifyOperatorSiteGraceExpired: vi.fn(),
}));

vi.mock('@/lib/sites/siteConfigStore', () => ({
  readSiteConfig: storeMocks.readSiteConfig,
  readExpiredPastDueSiteConfigs: storeMocks.readExpiredPastDueSiteConfigs,
  claimPastDueSiteConfigForExpiry: storeMocks.claimPastDueSiteConfigForExpiry,
  saveSiteConfig: storeMocks.saveSiteConfig,
}));

vi.mock('@/lib/sites/siteLifecycleNotifications', () => ({
  notifyBuyerSiteProvisioned: storeMocks.notifyBuyerSiteProvisioned,
  notifyBuyerSiteBillingUpdate: storeMocks.notifyBuyerSiteBillingUpdate,
  notifyBuyerSiteGraceExpired: storeMocks.notifyBuyerSiteGraceExpired,
  notifyOperatorSiteBillingUpdate: storeMocks.notifyOperatorSiteBillingUpdate,
  notifyOperatorSiteGraceExpired: storeMocks.notifyOperatorSiteGraceExpired,
}));

import {
  expirePastDueGracePeriods,
  provisionPaidAgentSite,
  resolveProvisionedAgentId,
  suspendProvisionedAgentSite,
  updateProvisionedAgentSiteBilling,
} from '@/lib/sites/siteProvisioning';

describe('site provisioning', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    storeMocks.readSiteConfig.mockResolvedValue(null);
    storeMocks.readExpiredPastDueSiteConfigs.mockResolvedValue([]);
    storeMocks.claimPastDueSiteConfigForExpiry.mockResolvedValue(true);
    storeMocks.saveSiteConfig.mockResolvedValue(['supabase', 'mongo']);
    storeMocks.notifyBuyerSiteProvisioned.mockResolvedValue({ status: 'skipped', reason: 'test', recipients: [] });
    storeMocks.notifyBuyerSiteBillingUpdate.mockResolvedValue({ status: 'skipped', reason: 'test', recipients: [] });
    storeMocks.notifyBuyerSiteGraceExpired.mockResolvedValue({ status: 'skipped', reason: 'test', recipients: [] });
    storeMocks.notifyOperatorSiteBillingUpdate.mockResolvedValue({ status: 'skipped', reason: 'test', recipients: [] });
    storeMocks.notifyOperatorSiteGraceExpired.mockResolvedValue({ status: 'skipped', reason: 'test', recipients: [] });
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

  it('records truthful audit and owner metadata for internal test seeding', async () => {
    const result = await provisionPaidAgentSite({
      agentId: 'cms-verification-run-123',
      userId: 'user-taz',
      ownerName: 'CMS Verification',
      email: 'taz@example.test',
      source: 'cms-test-seed:run-123',
      auditAction: 'cms.test-site.seeded',
      auditActor: 'cms-test-seed:user-taz',
      auditMessage: 'Disposable CMS verification site seeded for run run-123.',
    });
    expect(result.kit.ownerId).toBe('user-taz');
    expect(result.kit.billingProfile.userId).toBe('user-taz');
    expect(result.kit.provisioningAudit[0]).toEqual(expect.objectContaining({
      action: 'cms.test-site.seeded',
      actor: 'cms-test-seed:user-taz',
      message: 'Disposable CMS verification site seeded for run run-123.',
      source: 'cms-test-seed:run-123',
    }));
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

  it('refreshes interrupted billing from checkout when Stripe status is missing', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-23T12:00:00.000Z'));
    const existing = {
      ...createDefaultLaunchKit('broker-one'),
      ownerId: 'user-1',
      billingProfile: {
        userId: 'user-1',
        billingStatus: 'canceled',
        stripeCustomerId: 'cus_old',
        stripeSubscriptionId: 'sub_old',
        trialEndsAt: '2026-06-01T00:00:00.000Z',
      },
    };
    storeMocks.readSiteConfig.mockResolvedValue(existing);

    const result = await provisionPaidAgentSite({
      agentId: 'broker-one',
      userId: 'user-1',
      stripeCustomerId: 'cus_old',
      stripeSubscriptionId: 'sub_new',
      stripeCheckoutSessionId: 'cs_new',
    });

    expect(result.kit.billingProfile.billingStatus).toBe('trialing');
    expect(result.kit.billingProfile.trialEndsAt).toBe('2026-10-21T12:00:00.000Z');
    expect(result.kit.billingProfile.stripeSubscriptionId).toBe('sub_new');
  });

  it('rejects existing-site checkout refreshes from a different owner', async () => {
    storeMocks.readSiteConfig.mockResolvedValue({
      ...createDefaultLaunchKit('broker-one'),
      ownerId: 'user-1',
      billingProfile: {
        userId: 'user-1',
        billingStatus: 'active',
        stripeCustomerId: 'cus_123',
      },
    });

    await expect(provisionPaidAgentSite({
      agentId: 'broker-one',
      userId: 'user-2',
      stripeCustomerId: 'cus_456',
      stripeSubscriptionId: 'sub_new',
    })).rejects.toThrow('Stripe checkout user does not own the existing agent site.');
    expect(storeMocks.saveSiteConfig).not.toHaveBeenCalled();
  });

  it('does not fail provisioning after a successful save when buyer notification throws', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    storeMocks.notifyBuyerSiteProvisioned.mockRejectedValue(new Error('email offline'));

    const result = await provisionPaidAgentSite({
      userId: 'user_123',
      ownerName: 'Mina Patel',
      email: 'mina@example.test',
      stripeCheckoutSessionId: 'cs_test_123',
    });

    expect(result.created).toBe(true);
    expect(storeMocks.saveSiteConfig).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith('[SITE_PROVISIONING_BUYER_EMAIL_THROWN]', expect.any(Error));
    warnSpy.mockRestore();
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
      previousSiteStatus: 'draft',
    }));
    expect(storeMocks.saveSiteConfig).toHaveBeenCalledWith(
      expect.objectContaining({ agentId: 'broker-one', status: 'suspended' }),
      expect.objectContaining({ role: 'stripe-webhook' }),
    );
  });

  it('keeps a past-due live site active during the grace window', async () => {
    storeMocks.readSiteConfig.mockResolvedValue({
      ...createReadyApprovedKit('broker-one'),
      status: 'active',
    });

    const result = await updateProvisionedAgentSiteBilling({
      agentId: 'broker-one',
      email: 'agent@example.test',
      stripeSubscriptionId: 'sub_123',
      billingStatus: 'past_due',
      source: 'stripe-subscription-updated',
    });

    expect(result?.kit.status).toBe('active');
    expect(result?.kit.billingProfile.billingStatus).toBe('past_due');
    expect(result?.kit.billingProfile.gracePeriodEndsAt).toBeTruthy();
    expect(result?.kit.provisioningAudit[0]).toEqual(expect.objectContaining({
      action: 'customer.subscription.updated',
      billingStatus: 'past_due',
      siteStatus: 'active',
    }));
    expect(result?.readyToPublish).toBe(false);
    expect(storeMocks.saveSiteConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: 'broker-one',
        status: 'active',
        billingProfile: expect.objectContaining({
          billingStatus: 'past_due',
          gracePeriodEndsAt: expect.any(String),
        }),
      }),
      expect.objectContaining({ role: 'stripe-subscription-updated' }),
    );
    expect(storeMocks.notifyBuyerSiteBillingUpdate).toHaveBeenCalledWith(expect.objectContaining({
      status: 'past_due',
      previousStatus: 'active',
      email: 'agent@example.test',
      gracePeriodEndsAt: expect.any(String),
    }));
    expect(storeMocks.notifyOperatorSiteBillingUpdate).toHaveBeenCalledWith(expect.objectContaining({
      status: 'past_due',
      previousStatus: 'active',
      gracePeriodEndsAt: expect.any(String),
    }));
  });

  it('moves a past-due site to draft after the grace window expires', async () => {
    storeMocks.readSiteConfig.mockResolvedValue({
      ...createReadyApprovedKit('broker-one'),
      status: 'active',
      billingProfile: {
        billingStatus: 'past_due',
        stripeSubscriptionId: 'sub_123',
        gracePeriodEndsAt: new Date(Date.now() - 60_000).toISOString(),
      },
    });

    const result = await updateProvisionedAgentSiteBilling({
      agentId: 'broker-one',
      stripeSubscriptionId: 'sub_123',
      billingStatus: 'past_due',
      source: 'stripe-subscription-updated',
    });

    expect(result?.kit.status).toBe('draft');
    expect(result?.kit.billingProfile.gracePeriodEndsAt).toBeTruthy();
    expect(storeMocks.notifyBuyerSiteBillingUpdate).not.toHaveBeenCalled();
  });

  it('reactivates an approved ready site when subscription billing recovers', async () => {
    storeMocks.readSiteConfig.mockResolvedValue({
      ...createReadyApprovedKit('broker-one'),
      status: 'draft',
      billingProfile: {
        billingStatus: 'past_due',
        stripeSubscriptionId: 'sub_123',
        gracePeriodEndsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      provisioningAudit: [
        {
          id: 'evt_past_due',
          occurredAt: new Date(Date.now() - 60_000).toISOString(),
          action: 'customer.subscription.updated',
          source: 'stripe-subscription-updated',
          status: 'succeeded',
          message: 'Stripe subscription status changed to past_due; site status is active.',
          actor: 'stripe-webhook',
          stripeSubscriptionId: 'sub_123',
          billingStatus: 'past_due',
          siteStatus: 'active',
        },
      ],
    });

    const result = await updateProvisionedAgentSiteBilling({
      agentId: 'broker-one',
      stripeSubscriptionId: 'sub_123',
      billingStatus: 'active',
      source: 'stripe-subscription-updated',
    });

    expect(result?.kit.status).toBe('active');
    expect(result?.kit.billingProfile.billingStatus).toBe('active');
    expect(result?.kit.billingProfile.gracePeriodEndsAt).toBe('');
    expect(result?.readyToPublish).toBe(true);
    expect(storeMocks.notifyBuyerSiteBillingUpdate).toHaveBeenCalledWith(expect.objectContaining({
      status: 'active',
      previousStatus: 'past_due',
    }));
  });

  it('reactivates a ready site when billing recovers after subscription deletion', async () => {
    storeMocks.readSiteConfig.mockResolvedValue({
      ...createReadyApprovedKit('broker-one'),
      status: 'suspended',
      billingProfile: {
        billingStatus: 'canceled',
        stripeSubscriptionId: 'sub_123',
      },
      provisioningAudit: [
        {
          id: 'evt_deleted',
          occurredAt: new Date(Date.now() - 60_000).toISOString(),
          action: 'customer.subscription.deleted',
          source: 'stripe-subscription',
          status: 'succeeded',
          message: 'Stripe subscription ended; agent site access was suspended.',
          actor: 'stripe-webhook',
          stripeSubscriptionId: 'sub_123',
          billingStatus: 'canceled',
          previousSiteStatus: 'active',
          siteStatus: 'suspended',
        },
      ],
    });

    const result = await updateProvisionedAgentSiteBilling({
      agentId: 'broker-one',
      stripeSubscriptionId: 'sub_123',
      billingStatus: 'active',
      source: 'stripe-subscription-updated',
    });

    expect(result?.kit.status).toBe('active');
    expect(result?.kit.billingProfile.billingStatus).toBe('active');
  });

  it('does not fail billing updates after a successful save when notifications throw', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    storeMocks.notifyBuyerSiteBillingUpdate.mockRejectedValue(new Error('email offline'));
    storeMocks.readSiteConfig.mockResolvedValue({
      ...createReadyApprovedKit('broker-one'),
      status: 'active',
    });

    const result = await updateProvisionedAgentSiteBilling({
      agentId: 'broker-one',
      email: 'agent@example.test',
      stripeSubscriptionId: 'sub_123',
      billingStatus: 'past_due',
      source: 'stripe-subscription-updated',
    });

    expect(result?.kit.billingProfile.billingStatus).toBe('past_due');
    expect(storeMocks.saveSiteConfig).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith('[SITE_BILLING_NOTIFICATION_THROWN]', expect.any(Error));
    warnSpy.mockRestore();
  });

  it('keeps a recovered approved site in draft when billing interrupted draft setup', async () => {
    storeMocks.readSiteConfig.mockResolvedValue({
      ...createReadyApprovedKit('broker-one'),
      status: 'draft',
      billingProfile: {
        billingStatus: 'past_due',
        stripeSubscriptionId: 'sub_123',
        gracePeriodEndsAt: new Date(Date.now() - 60_000).toISOString(),
      },
      provisioningAudit: [
        {
          id: 'evt_grace_expired',
          occurredAt: new Date(Date.now() - 30_000).toISOString(),
          action: 'billing.grace_period.expired',
          source: 'site-billing-grace-cron',
          status: 'succeeded',
          message: 'Past-due grace window expired; site moved to draft.',
          actor: 'system-cron',
          stripeSubscriptionId: 'sub_123',
          billingStatus: 'past_due',
          siteStatus: 'draft',
        },
        {
          id: 'evt_past_due',
          occurredAt: new Date(Date.now() - 60_000).toISOString(),
          action: 'customer.subscription.updated',
          source: 'stripe-subscription-updated',
          status: 'succeeded',
          message: 'Stripe subscription status changed to past_due; site status is draft.',
          actor: 'stripe-webhook',
          stripeSubscriptionId: 'sub_123',
          billingStatus: 'past_due',
          siteStatus: 'draft',
        },
      ],
    });

    const result = await updateProvisionedAgentSiteBilling({
      agentId: 'broker-one',
      stripeSubscriptionId: 'sub_123',
      billingStatus: 'active',
      source: 'stripe-subscription-updated',
    });

    expect(result?.kit.status).toBe('draft');
    expect(result?.kit.billingProfile.billingStatus).toBe('active');
    expect(result?.kit.billingProfile.gracePeriodEndsAt).toBe('');
    expect(result?.readyToPublish).toBe(true);
    expect(result?.kit.provisioningAudit[0]).toEqual(expect.objectContaining({
      action: 'customer.subscription.updated',
      billingStatus: 'active',
      siteStatus: 'draft',
    }));
  });

  it('expires active past-due grace windows into draft status', async () => {
    const expiredGrace = new Date(Date.now() - 60_000).toISOString();
    storeMocks.readExpiredPastDueSiteConfigs.mockResolvedValue([{
      ...createReadyApprovedKit('broker-one'),
      status: 'active',
      billingProfile: {
        billingStatus: 'past_due',
        stripeSubscriptionId: 'sub_123',
        gracePeriodEndsAt: expiredGrace,
      },
    }]);

    const result = await expirePastDueGracePeriods({
      now: new Date(),
      source: 'site-billing-grace-cron',
    });

    expect(result).toEqual(expect.objectContaining({
      scanned: 1,
      expired: 1,
      skipped: 0,
    }));
    expect(storeMocks.saveSiteConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: 'broker-one',
        status: 'draft',
        billingProfile: expect.objectContaining({
          billingStatus: 'past_due',
          gracePeriodEndsAt: expiredGrace,
        }),
        provisioningAudit: expect.arrayContaining([
          expect.objectContaining({
            action: 'billing.grace_period.expired',
            billingStatus: 'past_due',
            siteStatus: 'draft',
          }),
        ]),
      }),
      expect.objectContaining({ role: 'site-billing-grace-cron' }),
    );
    expect(storeMocks.notifyBuyerSiteGraceExpired).toHaveBeenCalledWith(expect.objectContaining({
      kit: expect.objectContaining({
        agentId: 'broker-one',
        status: 'draft',
      }),
    }));
    expect(storeMocks.notifyOperatorSiteGraceExpired).toHaveBeenCalledWith(expect.objectContaining({
      kit: expect.objectContaining({
        agentId: 'broker-one',
        status: 'draft',
      }),
      publicUrl: expect.any(String),
    }));
  });

  it('does not fail grace expiration after a successful save when notifications throw', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const expiredGrace = new Date(Date.now() - 60_000).toISOString();
    storeMocks.notifyBuyerSiteGraceExpired.mockRejectedValue(new Error('email offline'));
    storeMocks.readExpiredPastDueSiteConfigs.mockResolvedValue([{
      ...createReadyApprovedKit('broker-one'),
      status: 'active',
      billingProfile: {
        billingStatus: 'past_due',
        stripeSubscriptionId: 'sub_123',
        gracePeriodEndsAt: expiredGrace,
      },
    }]);

    const result = await expirePastDueGracePeriods({
      now: new Date(),
      source: 'site-billing-grace-cron',
    });

    expect(result.expired).toBe(1);
    expect(storeMocks.saveSiteConfig).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith('[SITE_GRACE_EXPIRED_NOTIFICATION_THROWN]', expect.any(Error));
    warnSpy.mockRestore();
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
