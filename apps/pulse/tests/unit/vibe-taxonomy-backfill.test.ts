import { describe, expect, it } from 'vitest';
import { analyzeTaxonomyBackfill } from '@/lib/cms/taxonomyBackfill';

describe('taxonomy backfill dry-run analysis', () => {
  it('reports expected relationships, duplicates, unknown IDs, and tenant totals', () => {
    const report = analyzeTaxonomyBackfill([
      { tenantId: 'default', vibeId: 'one', taxonomyTermIds: ['mood:calm', 'mood:calm', 'unknown:value'] },
      { tenantId: 'other', vibeId: 'two', taxonomyTermIds: ['voice:warm'] },
    ]);
    expect(report).toMatchObject({ mode: 'dry-run', totalVibes: 2, expectedRelationships: 2, duplicateIds: 1, unknownLegacyIds: ['unknown:value'] });
    expect(report.tenants.default).toMatchObject({ vibes: 1, expectedRelationships: 1, duplicateIds: 1, unknownLegacyIds: ['unknown:value'] });
    expect(report.tenants.other).toMatchObject({ vibes: 1, expectedRelationships: 1, duplicateIds: 0, unknownLegacyIds: [] });
  });
});
