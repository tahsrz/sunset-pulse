import { describe, expect, it } from 'vitest';
import type {
  TenantDomainCandidateProvider,
  TenantDomainProjectionCandidate,
  TenantDomainQuery,
  TenantDomainRecord,
  TenantDomainRegistry,
} from '@/lib/tenancy/domainRegistry';
import { TenantDomainRegistryError } from '@/lib/tenancy/domainRegistry';
import { createTenantContextResolver } from '@/lib/tenancy/resolveTenantContext';
import {
  tenantA,
  tenantB,
  tenantSuspended,
  type TenantSecurityFixture,
} from '@/tests/fixtures/tenantFixtures';

const fixedNow = new Date('2026-08-20T14:00:00.000Z');

describe('tenant context resolver', () => {
  it('[RES-001] resolves an exact active production domain', async () => {
    const fake = createFakeRegistry([recordFor(tenantA)]);
    const resolver = createResolver(fake.registry);

    const result = await resolver.resolve(requestFor('alpha.sunsetpulse.app'));

    expect(result).toMatchObject({
      ok: true,
      context: {
        domain: { domainId: tenantA.context.domain.domainId },
        identity: { tenantId: tenantA.context.identity.tenantId },
        source: 'host',
      },
    });
    expect(fake.calls()).toBe(1);
  });

  it('[RES-002] fails closed for an unknown syntactically valid domain', async () => {
    const resolver = createResolver(createFakeRegistry([]).registry);

    await expectResolutionCode(
      resolver.resolve(requestFor('unknown.example.test')),
      'UNKNOWN_DOMAIN'
    );
  });

  it.each([
    ['RES-003', 'pending_verification'],
    ['RES-004', 'pending_propagation'],
    ['RES-005', 'suspended'],
    ['RES-006', 'revoked'],
  ] as const)('[%s] fails closed for a %s domain', async (_id, status) => {
    const record = recordFor(tenantA, {
      domain: { ...tenantA.context.domain, status },
    });
    const resolver = createResolver(createFakeRegistry([record]).registry);

    await expectResolutionCode(
      resolver.resolve(requestFor('alpha.sunsetpulse.app')),
      'DOMAIN_NOT_ACTIVE'
    );
  });

  it('[RES-007] does not use a preview-only row for a production request', async () => {
    const previewDomain = tenantA.domains[2];
    const fake = createFakeRegistry([recordFor(tenantA, { domain: previewDomain })]);
    const resolver = createResolver(fake.registry);

    await expectResolutionCode(
      resolver.resolve(requestFor(previewDomain.hostname)),
      'UNKNOWN_DOMAIN'
    );
  });

  it('[RES-008] rejects a projection candidate for another tenant', async () => {
    const record = recordFor(tenantA);
    const resolver = createResolver(createFakeRegistry([record]).registry, {
      candidateProvider: candidateProvider({
        ...candidateFor(record),
        tenantId: tenantB.context.identity.tenantId,
      }),
    });

    await expectResolutionCode(
      resolver.resolve(requestFor('alpha.sunsetpulse.app')),
      'AUTHORITATIVE_MISMATCH'
    );
  });

  it('[RES-009] rejects a projection revision behind the authoritative row', async () => {
    const record = recordFor(tenantA);
    const resolver = createResolver(createFakeRegistry([record]).registry, {
      candidateProvider: candidateProvider({
        ...candidateFor(record),
        revision: record.domain.revision - 1,
      }),
    });

    await expectResolutionCode(
      resolver.resolve(requestFor('alpha.sunsetpulse.app')),
      'STALE_PROJECTION'
    );
  });

  it('[RES-010] rejects a projection revision ahead of the authoritative row', async () => {
    const record = recordFor(tenantA);
    const resolver = createResolver(createFakeRegistry([record]).registry, {
      candidateProvider: candidateProvider({
        ...candidateFor(record),
        revision: record.domain.revision + 1,
      }),
    });

    await expectResolutionCode(
      resolver.resolve(requestFor('alpha.sunsetpulse.app')),
      'AUTHORITATIVE_MISMATCH'
    );
  });

  it('[RES-011] rejects a domain whose authoritative site is missing', async () => {
    const resolver = createResolver(createFakeRegistry([
      recordFor(tenantA, { identity: null, publication: null }),
    ]).registry);

    await expectResolutionCode(
      resolver.resolve(requestFor('alpha.sunsetpulse.app')),
      'TENANT_NOT_FOUND'
    );
  });

  it('[RES-012] rejects an unpublished site', async () => {
    const resolver = createResolver(createFakeRegistry([
      recordFor(tenantA, {
        publication: {
          ...tenantA.context.publication,
          status: 'draft',
          mayRenderPublicly: false,
          reason: 'draft',
        },
      }),
    ]).registry);

    await expectResolutionCode(
      resolver.resolve(requestFor('alpha.sunsetpulse.app')),
      'SITE_NOT_PUBLISHED'
    );
  });

  it('[RES-013/RES-014] ignores body and internal-header tenant claims', async () => {
    const fake = createFakeRegistry([recordFor(tenantA), recordFor(tenantB)]);
    const resolver = createResolver(fake.registry);
    const request = requestFor('alpha.sunsetpulse.app', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-sunset-agent-id': tenantB.context.identity.agentId,
        'x-sunset-tenant': tenantB.context.identity.slug,
      },
      body: JSON.stringify({ tenantId: tenantB.context.identity.tenantId }),
    });

    const result = await resolver.resolve(request);

    expect(result).toMatchObject({
      ok: true,
      context: { identity: { tenantId: tenantA.context.identity.tenantId } },
    });
  });

  it('[RES-015] ignores an untrusted forwarded-host claim', async () => {
    const fake = createFakeRegistry([recordFor(tenantA), recordFor(tenantB)]);
    const resolver = createResolver(fake.registry);
    const request = requestFor('alpha.sunsetpulse.app', {
      headers: { 'x-forwarded-host': 'bravo.sunsetpulse.app' },
    });

    const result = await resolver.resolve(request);

    expect(result).toMatchObject({
      ok: true,
      context: { identity: { tenantId: tenantA.context.identity.tenantId } },
    });
  });

  it('[RES-016] shares one registry lookup and Promise per Request object', async () => {
    const fake = createFakeRegistry([recordFor(tenantA)]);
    const resolver = createResolver(fake.registry);
    const request = requestFor('alpha.sunsetpulse.app');

    const first = resolver.resolve(request);
    const second = resolver.resolve(request);
    const third = resolver.resolve(request);

    expect(first).toBe(second);
    expect(second).toBe(third);
    const results = await Promise.all([first, second, third]);
    expect(results.every((result) => result.ok)).toBe(true);
    expect(fake.calls()).toBe(1);
  });

  it('[RES-017] does not share request-local cache entries across Request objects', async () => {
    const fake = createFakeRegistry([recordFor(tenantA)]);
    const resolver = createResolver(fake.registry);

    await Promise.all([
      resolver.resolve(requestFor('alpha.sunsetpulse.app')),
      resolver.resolve(requestFor('alpha.sunsetpulse.app')),
    ]);

    expect(fake.calls()).toBe(2);
  });

  it('[RES-018] does not let a failed request poison a later request', async () => {
    let calls = 0;
    const registry: TenantDomainRegistry = {
      async findExact() {
        calls += 1;
        if (calls === 1) throw new Error('temporary registry outage');
        return recordFor(tenantA);
      },
    };
    const resolver = createResolver(registry);

    await expect(resolver.require(requestFor('alpha.sunsetpulse.app'))).rejects.toMatchObject({
      name: 'TenantContextRequiredError',
      resolution: { code: 'DEPENDENCY_UNAVAILABLE' },
    });
    const recovered = await resolver.resolve(requestFor('alpha.sunsetpulse.app'));

    expect(recovered.ok).toBe(true);
    expect(calls).toBe(2);
  });

  it('[RES-019] maps distinct failures to redacted public responses', async () => {
    const inactive = recordFor(tenantSuspended);
    const ambiguousRegistry: TenantDomainRegistry = {
      async findExact() {
        throw new TenantDomainRegistryError(
          'AMBIGUOUS_DOMAIN',
          'Multiple authoritative rows matched the exact environment and hostname.'
        );
      },
    };
    const results = await Promise.all([
      createResolver(createFakeRegistry([]).registry).resolve(requestFor('missing.example.test')),
      createResolver(createFakeRegistry([inactive]).registry).resolve(
        requestFor('suspended.sunsetpulse.app')
      ),
      createResolver(ambiguousRegistry).resolve(requestFor('alpha.sunsetpulse.app')),
    ]);

    for (const result of results) {
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(result.error.publicStatus).toBe(404);
      expect(result.error.publicMessage).toBe('Site unavailable.');
      expect(result.error.publicMessage).not.toContain('alpha');
      expect(result.error.publicMessage).not.toContain(tenantA.context.identity.tenantId);
    }
  });

  it('requires exact agreement between domain and authoritative site identity', async () => {
    const resolver = createResolver(createFakeRegistry([
      recordFor(tenantA, { identity: tenantB.context.identity }),
    ]).registry);

    await expectResolutionCode(
      resolver.resolve(requestFor('alpha.sunsetpulse.app')),
      'AUTHORITATIVE_MISMATCH'
    );
  });

  it('requires active custom domains to retain verification evidence', async () => {
    const customDomain = tenantA.domains[1];
    const resolver = createResolver(createFakeRegistry([
      recordFor(tenantA, { domain: { ...customDomain, verifiedAt: null } }),
    ]).registry);

    await expectResolutionCode(
      resolver.resolve(requestFor(customDomain.hostname)),
      'DOMAIN_NOT_ACTIVE'
    );
  });

  it('treats an unavailable optional projection as a cache miss, not authority', async () => {
    const candidateProvider: TenantDomainCandidateProvider = {
      async findCandidate() {
        throw new Error('projection unavailable');
      },
    };
    const resolver = createResolver(createFakeRegistry([recordFor(tenantA)]).registry, {
      candidateProvider,
    });

    expect(await resolver.resolve(requestFor('alpha.sunsetpulse.app'))).toMatchObject({ ok: true });
  });

  it('uses a forwarded host only when trusted-proxy mode is explicit', async () => {
    const fake = createFakeRegistry([recordFor(tenantA), recordFor(tenantB)]);
    const resolver = createResolver(fake.registry, { trustForwardedHost: true });

    const result = await resolver.resolve(requestFor('alpha.sunsetpulse.app', {
      headers: { 'x-forwarded-host': 'bravo.sunsetpulse.app' },
    }));

    expect(result).toMatchObject({
      ok: true,
      context: { identity: { tenantId: tenantB.context.identity.tenantId } },
    });
  });
});

function createResolver(
  registry: TenantDomainRegistry,
  overrides: Partial<Parameters<typeof createTenantContextResolver>[0]> = {}
) {
  return createTenantContextResolver({
    registry,
    environment: 'production',
    createRequestId: () => 'request-resolver-test',
    now: () => fixedNow,
    ...overrides,
  });
}

function createFakeRegistry(records: readonly TenantDomainRecord[]) {
  let callCount = 0;
  const byExactKey = new Map(
    records.map((record) => [keyFor(record.domain), record])
  );

  const registry: TenantDomainRegistry = {
    async findExact(input) {
      callCount += 1;
      return byExactKey.get(keyFor(input)) || null;
    },
  };

  return { registry, calls: () => callCount };
}

function recordFor(
  fixture: TenantSecurityFixture,
  overrides: Partial<TenantDomainRecord> = {}
): TenantDomainRecord {
  return Object.freeze({
    domain: fixture.context.domain,
    identity: fixture.context.identity,
    publication: fixture.context.publication,
    ...overrides,
  });
}

function candidateFor(record: TenantDomainRecord): TenantDomainProjectionCandidate {
  return Object.freeze({
    domainId: record.domain.domainId,
    environment: record.domain.environment,
    hostname: record.domain.hostname,
    tenantId: record.domain.tenantId,
    revision: record.domain.revision,
  });
}

function candidateProvider(
  candidate: TenantDomainProjectionCandidate
): TenantDomainCandidateProvider {
  return { async findCandidate() { return candidate; } };
}

function keyFor(input: Pick<TenantDomainQuery, 'environment' | 'hostname'>) {
  return `${input.environment}:${input.hostname}`;
}

function requestFor(host: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('host', host);
  return new Request(`https://${host}/tenant-test`, { ...init, headers });
}

async function expectResolutionCode(
  resultPromise: ReturnType<ReturnType<typeof createTenantContextResolver>['resolve']>,
  code: string
) {
  const result = await resultPromise;
  expect(result).toMatchObject({ ok: false, error: { code } });
}
