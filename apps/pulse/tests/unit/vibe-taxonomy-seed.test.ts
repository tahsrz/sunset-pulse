import { describe, expect, it } from 'vitest';
import { buildControlledTaxonomySeed } from '@/lib/cms/taxonomySeed';

describe('controlled taxonomy seed', () => {
  it('maps every current group and term to deterministic normalized records', () => {
    const seed = buildControlledTaxonomySeed();
    expect(seed.map((entry) => entry.taxonomy.slug)).toEqual(['mood', 'audience', 'visualFamily', 'voice', 'industryUse']);
    expect(seed.flatMap((entry) => entry.terms)).toContainEqual({ slug: 'calm', label: 'Calm', legacyId: 'mood:calm' });
    expect(seed.flatMap((entry) => entry.terms)).toContainEqual({ slug: 'real-estate', label: 'Real Estate', legacyId: 'industryUse:real-estate' });
  });

  it('produces unique legacy IDs', () => {
    const legacyIds = buildControlledTaxonomySeed().flatMap((entry) => entry.terms.map((term) => term.legacyId));
    expect(new Set(legacyIds).size).toBe(legacyIds.length);
  });
});
