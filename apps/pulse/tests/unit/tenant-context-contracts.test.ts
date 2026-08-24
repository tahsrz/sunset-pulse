import { describe, expect, it } from 'vitest';
import { createTenantResolutionError, TenantContextRequiredError } from '@/lib/tenancy/errors';
import { listingSecurityFixtures } from '@/tests/fixtures/listingFixtures';
import { tenantSecurityFixtures } from '@/tests/fixtures/tenantFixtures';

describe('TenantContext contracts and security fixtures', () => {
  it('keeps identity, domain, and publication explicit', () => {
    const { context } = tenantSecurityFixtures.tenantA;

    expect(context.identity).toMatchObject({
      tenantId: '10000000-0000-4000-8000-000000000001',
      agentId: 'agent-alpha-001',
      siteConfigId: '10000000-0000-4000-8000-000000000001',
    });
    expect(context.domain).toMatchObject({
      hostname: 'alpha.sunsetpulse.app',
      environment: 'production',
      status: 'active',
    });
    expect(context.publication.mayRenderPublicly).toBe(true);
    expect(context).not.toHaveProperty('role');
    expect(context).not.toHaveProperty('capabilities');
  });

  it('uses distinct authority IDs across unrelated tenant fixtures', () => {
    const alpha = tenantSecurityFixtures.tenantA.context;
    const bravo = tenantSecurityFixtures.tenantB.context;

    expect(alpha.identity.tenantId).not.toBe(bravo.identity.tenantId);
    expect(alpha.identity.agentId).not.toBe(bravo.identity.agentId);
    expect(alpha.identity.siteConfigId).not.toBe(bravo.identity.siteConfigId);
    expect(alpha.identity.ownerId).not.toBe(bravo.identity.ownerId);
    expect(alpha.domain.domainId).not.toBe(bravo.domain.domainId);
  });

  it('models explicit co-listing without sharing tenant authority', () => {
    const shared = listingSecurityFixtures.sharedListingAB.id;
    const assignments = listingSecurityFixtures.assignments.filter(
      (assignment) => assignment.listingId === shared
    );

    expect(assignments.map((assignment) => assignment.tenantId).sort()).toEqual([
      '10000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
    ]);
  });

  it('populates sensitive listing fields for future projection-negative tests', () => {
    expect(listingSecurityFixtures.publicListingA).toMatchObject({
      owner: expect.any(String),
      seller: expect.any(Object),
      lockboxCode: expect.any(String),
      privateRemarks: expect.any(String),
      providerPayload: expect.any(Object),
      metadata: expect.objectContaining({ privateDocumentUrl: expect.any(String) }),
    });
  });

  it('collapses resolution failures to one public message', () => {
    const missing = createTenantResolutionError('UNKNOWN_DOMAIN', 'No exact domain row matched.');
    const suspended = createTenantResolutionError('DOMAIN_NOT_ACTIVE', 'The domain was suspended.');

    expect(missing.publicStatus).toBe(404);
    expect(suspended.publicStatus).toBe(404);
    expect(missing.publicMessage).toBe('Site unavailable.');
    expect(suspended.publicMessage).toBe(missing.publicMessage);
    expect(new TenantContextRequiredError(suspended).message).toBe('Site unavailable.');
  });

  it('uses 503 only for dependency unavailability', () => {
    expect(createTenantResolutionError(
      'DEPENDENCY_UNAVAILABLE',
      'The authoritative registry was unavailable.'
    ).publicStatus).toBe(503);
  });
});
