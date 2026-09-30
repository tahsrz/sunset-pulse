import { describe, expect, it } from 'vitest';
import { neighborhoodGuideSchema } from '@/lib/marketing/neighborhoodGuideSchema';
import oldTownKeller from '@/content/neighborhoods/old-town-keller.v1.json';
import westBurseyRanch from '@/content/neighborhoods/west-bursey-ranch.v1.json';
import westlakeOverview from '@/content/neighborhoods/westlake-overview.v1.json';

const fixtures = [oldTownKeller, westBurseyRanch, westlakeOverview];

describe('reviewed Keller / Westlake guides', () => {
  it('parses only published, source-linked guide records with explicit local scope', () => {
    for (const fixture of fixtures) {
      const parsed = neighborhoodGuideSchema.parse(fixture);
      expect(parsed.status).toBe('published');
      expect(parsed.areaKey).toBe('keller-westlake');
      expect(parsed.reviewedAt).toBe('2026-09-30');
      expect(parsed.sections.every((section) => section.evidenceIds.length > 0)).toBe(true);
    }
  });

  it('rejects executable/unknown schema fields and broken evidence references', () => {
    expect(neighborhoodGuideSchema.safeParse({ ...oldTownKeller, render: 'import("./arbitrary")' }).success).toBe(false);
    expect(neighborhoodGuideSchema.safeParse({ ...oldTownKeller, sections: [{ ...oldTownKeller.sections[0], evidenceIds: ['missing'] }, ...oldTownKeller.sections.slice(1)] }).success).toBe(false);
  });

  it('rejects non-HTTPS source links and unsupported coverage', () => {
    const badSource = { ...oldTownKeller, evidence: oldTownKeller.evidence.map((item, index) => index ? item : { ...item, sourceUrl: 'javascript:alert(1)' }) };
    expect(neighborhoodGuideSchema.safeParse(badSource).success).toBe(false);
    expect(neighborhoodGuideSchema.safeParse({ ...oldTownKeller, coverageType: 'school-zone' }).success).toBe(false);
  });

  it('rejects evidence expiry dates that predate retrieval', () => {
    const staleContract = { ...oldTownKeller, evidence: oldTownKeller.evidence.map((item, index) => index ? item : { ...item, expiresAt: '2020-01-01' }) };
    expect(neighborhoodGuideSchema.safeParse(staleContract).success).toBe(false);
  });

  it('does not claim property-specific school, HOA or drive-time verification', () => {
    const serialized = JSON.stringify(fixtures);
    expect(serialized).toContain('assignment not determined');
    expect(serialized).toContain('HOA fees');
    expect(serialized).toContain('drive time: not verified');
  });
});
