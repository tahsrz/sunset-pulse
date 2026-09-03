import { describe, expect, it } from 'vitest';
import { buildNormalizedTaxonomyCatalogPipeline, buildNormalizedTaxonomyUsagePipeline, diffTaxonomyRelationships, diffTaxonomyUsageCounts, hasTaxonomyParentCycle } from '@/lib/cms/taxonomyRepository';

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

  it('detects self-parenting and descendant-parenting without rejecting a valid ancestor', async () => {
    const parents = new Map([['child', 'root'], ['root', null]]);
    expect(await hasTaxonomyParentCycle('child', 'child', async (id) => parents.get(id) || null)).toBe(true);
    expect(await hasTaxonomyParentCycle('root', 'child', async (id) => parents.get(id) || null)).toBe(true);
    expect(await hasTaxonomyParentCycle('child', 'root', async (id) => parents.get(id) || null)).toBe(false);
  });

  it('scopes normalized usage to a tenant, active legacy terms, and non-trash Vibes', () => {
    const serialized = JSON.stringify(buildNormalizedTaxonomyUsagePipeline('tenant-a'));
    expect(serialized).toContain('"tenantId":"tenant-a"');
    expect(serialized).toContain('"term.status":"active"');
    expect(serialized).toContain('"term.legacyId"');
    expect(serialized).toContain('"status":{"$ne":"trash"}');
    expect(serialized).toContain('"$eq":["$tenantId","$$relationshipTenantId"]');
  });

  it('builds a tenant-scoped active catalog with compatibility IDs and stable sorting', () => {
    const serialized = JSON.stringify(buildNormalizedTaxonomyCatalogPipeline('tenant-a'));
    expect(serialized).toContain('"tenantId":"tenant-a"');
    expect(serialized).toContain('"status":"active"');
    expect(serialized).toContain('"taxonomy.status":"active"');
    expect(serialized).toContain('"$ifNull":["$legacyId"');
    expect(serialized).toContain('"$split":["$legacyId",":"]');
    expect(serialized).toContain('"label":"$label"');
    expect(serialized).toContain('"description":"$description"');
    expect(serialized).toContain('"parentId":{"$arrayElemAt":["$parent.legacyId",0]}');
    expect(serialized).toContain('"id"');
    expect(serialized).toContain('"group":1,"term":1');
  });

  it('can include archived terms for the management directory', () => {
    const serialized = JSON.stringify(buildNormalizedTaxonomyCatalogPipeline('tenant-a', true));
    expect(serialized).toContain('"$in":["active","archived"]');
    expect(serialized).toContain('"status":"$status"');
  });
});
