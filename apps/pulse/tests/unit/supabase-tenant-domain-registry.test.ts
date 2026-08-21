import { describe, expect, it } from 'vitest';
import { mapTenantDomainRow } from '@/lib/tenancy/supabaseTenantDomainRegistry';
import { TenantDomainRegistryError } from '@/lib/tenancy/domainRegistry';
import type { TenantDomainQuery } from '@/lib/tenancy/domainRegistry';

const query: TenantDomainQuery = {
  environment: 'production',
  hostname: 'alpha.sunsetpulse.app' as never,
};

const row = {
  id: 'domain-a',
  site_config_id: 'site-a',
  hostname: 'alpha.sunsetpulse.app',
  environment: 'production',
  kind: 'platform_subdomain',
  status: 'active',
  revision: 4,
  verified_at: null,
  site_config: {
    id: 'site-a',
    agent_id: 'agent-a',
    subdomain: 'alpha',
    owner_id: 'owner-a',
    status: 'active',
    review_profile: { status: 'approved' },
    billing_profile: { billingStatus: 'active' },
    publication_revision: 9,
  },
};

describe('Supabase tenant domain registry mapping', () => {
  it('maps bounded domain and site fields into the resolver contract', () => {
    const result = mapTenantDomainRow(row, query);

    expect(result).toEqual({
      domain: {
        domainId: 'domain-a',
        hostname: 'alpha.sunsetpulse.app',
        environment: 'production',
        kind: 'platform_subdomain',
        status: 'active',
        tenantId: 'site-a',
        revision: 4,
        verifiedAt: null,
      },
      identity: {
        tenantId: 'site-a',
        siteConfigId: 'site-a',
        agentId: 'agent-a',
        slug: 'alpha',
        ownerId: 'owner-a',
      },
      publication: {
        status: 'active',
        reviewStatus: 'approved',
        billingState: 'active',
        mayRenderPublicly: true,
        reason: 'ready',
        effectiveUntil: null,
        revision: 9,
      },
    });
  });

  it('fails closed when the relation points at another site', () => {
    expect(() => mapTenantDomainRow({
      ...row,
      site_config: { ...row.site_config, id: 'site-b' },
    }, query)).toThrowError(TenantDomainRegistryError);
  });

  it('blocks suspended or unapproved publication without hiding the domain identity', () => {
    const result = mapTenantDomainRow({
      ...row,
      site_config: {
        ...row.site_config,
        status: 'suspended',
        review_profile: { status: 'pending' },
        billing_profile: { billingStatus: 'suspended' },
      },
    }, query);

    expect(result.publication).toMatchObject({
      status: 'suspended',
      reviewStatus: 'pending',
      billingState: 'suspended',
      mayRenderPublicly: false,
    });
  });

  it('fails closed when billing or site state is missing or unknown', () => {
    const result = mapTenantDomainRow({
      ...row,
      site_config: {
        ...row.site_config,
        status: 'unexpected_status',
        billing_profile: { billingStatus: 'past_due' },
      },
    }, query);

    expect(result.publication).toMatchObject({
      status: 'draft',
      billingState: 'unlinked',
      mayRenderPublicly: false,
    });
  });
});
