import { describe, expect, it } from 'vitest';
import {
  agentLaunchKitSchema,
  createDefaultLaunchKit,
  getLaunchKitSummary,
  normalizeLaunchKit,
  parseListInput,
  toSiteConfigMongoRecord,
  toSiteConfigSupabaseRecord,
} from '@/lib/sites/launchKit';

describe('launchKit', () => {
  it('creates a draft launch kit with a stable public URL summary', () => {
    const kit = createDefaultLaunchKit('North-Texas_Agent-01');
    const summary = getLaunchKitSummary(kit);

    expect(kit.agentId).toBe('north-texas_agent-01');
    expect(kit.subdomain).toBe('north-texas-agent-01');
    expect(kit.status).toBe('draft');
    expect(summary.publicUrl).toContain('north-texas-agent-01.sunsetpulse.app');
    expect(summary.readyToPublish).toBe(false);
    expect(summary.readiness.some((check) => check.key === 'hotList' && !check.complete)).toBe(true);
  });

  it('normalizes stored snake_case site config into the launch-kit shape', () => {
    const kit = normalizeLaunchKit({
      agent_id: 'Broker-One',
      owner_name: 'Broker One',
      custom_domain: 'broker.example.test',
      subscription_tier: 'atlas',
      branding: {
        siteName: 'Broker One Homes',
        primaryColor: '#0f766e',
        fontFamily: 'Inter',
        mainBackground: '#052e2b',
        navBackground: '#134e4a',
        quadrants: {
          topLeft: { background: '#052e2b', color: '#ccfbf1' },
          topRight: { background: '#134e4a', color: '#ffffff' },
          bottomLeft: { background: '#134e4a', color: '#ffffff' },
          bottomRight: { background: '#052e2b', color: '#ccfbf1' },
        },
        visualLoci: {
          source: 'dictionary',
          name: 'Forest',
          sourceId: 'Forest',
        },
      },
      hero: {
        title: 'Broker One local search',
        subtitle: 'Find homes with a local assistant.',
      },
      agent_profile: {
        displayName: 'Broker One',
        brokerageName: 'One Realty',
        email: 'broker@example.test',
        markets: ['Dallas'],
      },
      integration_profile: {
        leadEmail: 'leads@example.test',
        hotListMlsIds: ['NTREIS-1'],
      },
      provisioning_audit: [
        {
          id: 'evt_old',
          occurredAt: '2026-07-16T15:00:00.000Z',
          action: 'checkout.session.completed',
          source: 'stripe-checkout',
          status: 'succeeded',
          message: 'Stripe checkout provisioned a new draft agent site.',
          stripeCheckoutSessionId: 'cs_test_123',
          billingStatus: 'trialing',
          siteStatus: 'draft',
        },
      ],
    });

    expect(kit.agentId).toBe('broker-one');
    expect(kit.ownerName).toBe('Broker One');
    expect(kit.customDomain).toBe('broker.example.test');
    expect(kit.subscriptionTier).toBe('atlas');
    expect(kit.branding.mainBackground).toBe('#052e2b');
    expect(kit.branding.quadrants?.topLeft.background).toBe('#052e2b');
    expect(kit.branding.visualLoci).toEqual(expect.objectContaining({ name: 'Forest' }));
    expect(kit.agentProfile.displayName).toBe('Broker One');
    expect(kit.integrationProfile.hotListMlsIds).toEqual(['NTREIS-1']);
    expect(kit.provisioningAudit[0]).toEqual(expect.objectContaining({
      action: 'checkout.session.completed',
      stripeCheckoutSessionId: 'cs_test_123',
    }));
  });

  it('falls back incomplete visual loci to a valid launch-kit default', () => {
    const kit = normalizeLaunchKit({
      ...createDefaultLaunchKit(),
      branding: {
        siteName: 'Partial Visual Homes',
        primaryColor: '#0f766e',
        fontFamily: 'Inter',
        quadrants: {
          topLeft: { background: 'not-a-color' },
        },
      },
    });

    expect(kit.branding.quadrants?.topLeft.background).toBe('#0f172a');
    expect(kit.branding.quadrants?.topLeft.color).toBe('#f8fafc');
    expect(kit.branding.quadrants?.bottomRight.background).toBe('#0f172a');
  });

  it('trims optional URL inputs and accepts cleared optional fields', () => {
    const kit = createDefaultLaunchKit();

    expect(agentLaunchKitSchema.parse({
      ...kit,
      customDomain: '   ',
      hero: { ...kit.hero, backgroundImage: '   ' },
      agentProfile: { ...kit.agentProfile, headshotUrl: '   ' },
      integrationProfile: { ...kit.integrationProfile, calendarUrl: '   ' },
    })).toEqual(expect.objectContaining({
      customDomain: '',
      hero: expect.objectContaining({ backgroundImage: '' }),
      agentProfile: expect.objectContaining({ headshotUrl: '' }),
      integrationProfile: expect.objectContaining({ calendarUrl: '' }),
    }));
  });

  it('serializes launch kits for both storage backends', () => {
    const kit = normalizeLaunchKit({
      ...createDefaultLaunchKit(),
      integrationProfile: { hotListMlsIds: ['NTREIS-1'] },
    });
    const supabaseRecord = toSiteConfigSupabaseRecord(kit, { email: 'operator@example.test' });
    const mongoRecord = toSiteConfigMongoRecord(kit, { role: 'local' });

    expect(supabaseRecord.agent_id).toBe(kit.agentId);
    expect(supabaseRecord.branding.visualLoci?.name).toBe('Dark Mode');
    expect(supabaseRecord.provisioning_audit).toEqual(kit.provisioningAudit);
    expect(supabaseRecord.last_modified_by).toBe('operator@example.test');
    expect(supabaseRecord.sections.map((section) => section.type)).toContain('featured_listings');
    expect(mongoRecord.agentId).toBe(kit.agentId);
    expect(mongoRecord.provisioningAudit).toEqual(kit.provisioningAudit);
    expect(mongoRecord.lastModifiedBy).toBe('local');
  });

  it('requires billing and operator approval before a kit is publishable', () => {
    const incompleteGate = getLaunchKitSummary(normalizeLaunchKit({
      ...createDefaultLaunchKit('Broker-One'),
      integrationProfile: {
        ...createDefaultLaunchKit('Broker-One').integrationProfile,
        hotListMlsIds: ['NTREIS-1'],
      },
    }));

    expect(incompleteGate.readyToPublish).toBe(false);
    expect(incompleteGate.publishGate.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'billing', complete: false }),
      expect.objectContaining({ key: 'review', complete: false }),
    ]));

    const approvedGate = getLaunchKitSummary(normalizeLaunchKit({
      ...incompleteGate.kit,
      billingProfile: {
        billingStatus: 'trialing',
        trialEndsAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      },
      reviewProfile: {
        status: 'approved',
      },
    }));

    expect(approvedGate.readyToPublish).toBe(true);
  });

  it('parses comma and newline separated hot-list inputs', () => {
    expect(parseListInput('NTREIS-1, NTREIS-2\nNTREIS-3')).toEqual([
      'NTREIS-1',
      'NTREIS-2',
      'NTREIS-3',
    ]);
  });
});
