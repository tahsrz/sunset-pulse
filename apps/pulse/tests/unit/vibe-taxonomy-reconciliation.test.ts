import { describe, expect, it } from 'vitest';
import { buildTaxonomyReconciliationReport } from '@/lib/cms/taxonomyReconciliation';

describe('taxonomy usage reconciliation', () => {
  it('reports agreement for identical term counts', () => {
    expect(buildTaxonomyReconciliationReport({ tenantId: 'default', embeddedCounts: { a: 2 }, normalizedCounts: { a: 2 } })).toMatchObject({
      tenantId: 'default', state: 'agrees', embeddedTotal: 2, normalizedTotal: 2, mismatchTermIds: [],
    });
  });

  it('reports missing, removed, and changed terms deterministically', () => {
    const report = buildTaxonomyReconciliationReport({ tenantId: 'tenant-b', embeddedCounts: { a: 2, b: 1 }, normalizedCounts: { a: 1, c: 3 } });
    expect(report).toMatchObject({
      tenantId: 'tenant-b', state: 'mismatch', embeddedTotal: 3, normalizedTotal: 4, mismatchTermIds: ['a', 'b', 'c'],
    });
    expect(report.terms).toEqual([
      { termId: 'a', embedded: 2, normalized: 1 },
      { termId: 'b', embedded: 1, normalized: 0 },
      { termId: 'c', embedded: 0, normalized: 3 },
    ]);
  });
});
