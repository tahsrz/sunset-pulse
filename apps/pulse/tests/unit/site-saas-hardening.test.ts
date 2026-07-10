import { describe, expect, it } from 'vitest';
import { mergeAgentProfile, mergeComplianceProfile, mergeIntegrationProfile } from '@/lib/sites/agentConfig';
import { getSiteReadinessChecks, isSiteReadyToPublish } from '@/lib/sites/siteReadiness';
import { getAgentSiteSubdomain, getPublicAgentSiteUrl, normalizeRootDomain, normalizeTenantSlug } from '@/lib/sites/siteUrls';

describe('agent site SaaS hardening helpers', () => {
  it('builds stable public URLs from agent ids, subdomains, custom domains, and root domains', () => {
    expect(getAgentSiteSubdomain('taz-realty-001')).toBe('taz');
    expect(getAgentSiteSubdomain('North_Texas_Agent-site')).toBe('north-texas-agent');
    expect(getPublicAgentSiteUrl({ agentId: 'agent-one', rootDomain: 'https://www.sunsetpulse.test' })).toBe('https://agent-one.sunsetpulse.test');
    expect(getPublicAgentSiteUrl({ agentId: 'agent-one', subdomain: 'luxury', rootDomain: 'sunsetpulse.test' })).toBe('https://luxury.sunsetpulse.test');
    expect(getPublicAgentSiteUrl({ customDomain: 'https://homes.example.com/path' })).toBe('https://homes.example.com');
  });

  it('normalizes tenant URL inputs defensively', () => {
    expect(normalizeRootDomain('https://www.sunsetpulse.app/demo')).toBe('sunsetpulse.app');
    expect(normalizeRootDomain('vercel.app')).toBe('sunsetpulse.app');
    expect(normalizeTenantSlug(' North-Texas ')).toBe('north-texas');
    expect(normalizeTenantSlug('../oops')).toBeNull();
    expect(normalizeTenantSlug('bad tenant')).toBeNull();
  });

  it('requires agent identity, contact, compliance, and MLS IDs before publish', () => {
    const baseSite = {
      siteName: 'Demo Homes',
      agentProfile: mergeAgentProfile({
        displayName: 'Demo Agent',
        brokerageName: 'Demo Brokerage',
        email: 'agent@example.com',
      }),
      complianceProfile: mergeComplianceProfile({
        footerDisclaimer: 'Verify all information.',
        mlsDisclaimer: 'MLS details should be independently verified.',
      }),
      integrationProfile: mergeIntegrationProfile({
        hotListMlsIds: ['21177832'],
      }),
    };

    expect(isSiteReadyToPublish(baseSite)).toBe(true);

    const missingHotList = {
      ...baseSite,
      integrationProfile: mergeIntegrationProfile({ hotListMlsIds: [] }),
    };

    expect(isSiteReadyToPublish(missingHotList)).toBe(false);
    expect(getSiteReadinessChecks(missingHotList).find((check) => check.key === 'hotList')).toMatchObject({
      complete: false,
    });
  });
});
