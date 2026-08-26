import type {
  ResolvedDomain,
  TenantContext,
  TenantIdentity,
  TenantPublication,
} from '@/lib/tenancy/contracts';
import { normalizeHost } from '@/lib/tenancy/normalizeHost';

export type TenantSecurityFixture = Readonly<{
  context: TenantContext;
  domains: readonly ResolvedDomain[];
}>;

const resolvedAt = '2026-08-20T12:00:00.000Z';

export const tenantA = createTenantFixture({
  key: 'alpha',
  tenantId: '10000000-0000-4000-8000-000000000001',
  agentId: 'agent-alpha-001',
  siteConfigId: '10000000-0000-4000-8000-000000000001',
  ownerId: '30000000-0000-4000-8000-000000000001',
  slug: 'alpha',
  domains: [
    domain('40000000-0000-4000-8000-000000000001', 'alpha.sunsetpulse.app', 'production', 'platform_subdomain', '10000000-0000-4000-8000-000000000001', 3),
    domain('40000000-0000-4000-8000-000000000002', 'homes.alpha.example', 'production', 'custom_domain', '10000000-0000-4000-8000-000000000001', 2),
    domain('40000000-0000-4000-8000-000000000003', 'alpha.preview.sunsetpulse.test', 'preview', 'custom_domain', '10000000-0000-4000-8000-000000000001', 4),
  ],
});

export const tenantB = createTenantFixture({
  key: 'bravo',
  tenantId: '10000000-0000-4000-8000-000000000002',
  agentId: 'agent-bravo-002',
  siteConfigId: '10000000-0000-4000-8000-000000000002',
  ownerId: '30000000-0000-4000-8000-000000000002',
  slug: 'bravo',
  domains: [
    domain('40000000-0000-4000-8000-000000000004', 'bravo.sunsetpulse.app', 'production', 'platform_subdomain', '10000000-0000-4000-8000-000000000002', 7),
  ],
});

export const tenantSuspended = createTenantFixture({
  key: 'suspended',
  tenantId: '10000000-0000-4000-8000-000000000003',
  agentId: 'agent-suspended-003',
  siteConfigId: '10000000-0000-4000-8000-000000000003',
  ownerId: '30000000-0000-4000-8000-000000000003',
  slug: 'suspended',
  domains: [
    domain('40000000-0000-4000-8000-000000000005', 'suspended.sunsetpulse.app', 'production', 'platform_subdomain', '10000000-0000-4000-8000-000000000003', 5, 'suspended'),
  ],
  publication: {
    status: 'suspended',
    reviewStatus: 'approved',
    billingState: 'suspended',
    mayRenderPublicly: false,
    reason: 'billing_suspended',
    effectiveUntil: null,
    revision: 5,
  },
});

export const tenantSecurityFixtures = Object.freeze({
  tenantA,
  tenantB,
  tenantSuspended,
});

function createTenantFixture(input: {
  key: string;
  tenantId: string;
  agentId: string;
  siteConfigId: string;
  ownerId: string;
  slug: string;
  domains: readonly ResolvedDomain[];
  publication?: TenantPublication;
}): TenantSecurityFixture {
  const identity: TenantIdentity = Object.freeze({
    tenantId: input.tenantId,
    agentId: input.agentId,
    siteConfigId: input.siteConfigId,
    ownerId: input.ownerId,
    slug: input.slug,
  });
  const publication = input.publication || Object.freeze({
    status: 'active' as const,
    reviewStatus: 'approved' as const,
    billingState: 'active' as const,
    mayRenderPublicly: true,
    reason: 'published',
    effectiveUntil: null,
    revision: 1,
  });

  return Object.freeze({
    domains: Object.freeze([...input.domains]),
    context: Object.freeze({
      requestId: `request-${input.key}-fixture`,
      domain: input.domains[0],
      identity,
      publication,
      source: 'internal_test',
      resolvedAt,
    }),
  });
}

function domain(
  domainId: string,
  rawHostname: string,
  environment: ResolvedDomain['environment'],
  kind: ResolvedDomain['kind'],
  tenantId: string,
  revision: number,
  status: ResolvedDomain['status'] = 'active'
): ResolvedDomain {
  const normalized = normalizeHost(rawHostname);
  if (!normalized.ok) throw new Error(`Invalid tenant fixture hostname: ${rawHostname}`);

  return Object.freeze({
    domainId,
    hostname: normalized.value.hostname,
    environment,
    kind,
    status,
    tenantId,
    revision,
    verifiedAt: kind === 'custom_domain' ? '2026-08-19T12:00:00.000Z' : null,
  });
}
