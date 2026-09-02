import { describe, expect, it } from 'vitest';
import { buildNormalizedTaxonomyUsagePipeline, diffTaxonomyRelationships, diffTaxonomyUsageCounts } from '@/lib/cms/taxonomyRepository';

describe('taxonomy relationship reconciliation', () => {
  it('adds and removes only changed terms', () => {
    expect(diffTaxonomyRelationships(['a', 'b'], ['b', 'c'])).toEqual({
      addTermIds: ['c'],
      removeTermIds: ['a'],
    });
  });

  it('deduplicates desired relationships and is stable on repeated writes', () => {
    expect(diffTaxonomyRelationships(['a', 'b'], ['a', 'b', 'b'])).toEqual({
      addTermIds: [],
      removeTermIds: [],
    });
  });

  it('reports count mismatches from either read authority', () => {
    expect(diffTaxonomyUsageCounts({ a: 2, b: 1 }, { a: 2, c: 1 })).toEqual(['b', 'c']);
  });

  it('scopes normalized usage to a tenant, active legacy terms, and non-trash Vibes', () => {
    const serialized = JSON.stringify(buildNormalizedTaxonomyUsagePipeline('tenant-a'));
    expect(serialized).toContain('"tenantId":"tenant-a"');
    expect(serialized).toContain('"term.status":"active"');
    expect(serialized).toContain('"term.legacyId"');
    expect(serialized).toContain('"status":{"$ne":"trash"}');
    expect(serialized).toContain('"$eq":["$tenantId","$$relationshipTenantId"]');
  });
});
