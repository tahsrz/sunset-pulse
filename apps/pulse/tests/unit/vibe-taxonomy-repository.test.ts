import { describe, expect, it } from 'vitest';
import { diffTaxonomyRelationships, diffTaxonomyUsageCounts } from '@/lib/cms/taxonomyRepository';

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
});
