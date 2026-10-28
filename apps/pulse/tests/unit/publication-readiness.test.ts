import { describe, expect, it } from 'vitest';
import { guidePublicationReadiness, publicationCatalog, publicationReadinessSchema, sellerPublicationReadiness, unavailablePublication } from '@/lib/marketing/publicationReadiness';
import { sellerIntroductionSchema } from '@/lib/marketing/sellerIntroductionSchema';
import { neighborhoodGuideSchema } from '@/lib/marketing/neighborhoodGuideSchema';
import { neighborhoodPresentationSchema } from '@/lib/marketing/neighborhoodPresentation';
import oldTown from '@/content/neighborhoods/old-town-keller.v1.json';

const today = '2026-10-28';
const guide = () => neighborhoodGuideSchema.parse(oldTown);
const visual = () => neighborhoodPresentationSchema.parse({
  schemaVersion: 1, slug: 'old-town-keller', status: 'published', photos: [],
  map: { latitude: 32.9, longitude: -97.2, zoom: 12 },
  places: [{ id: 'park', name: 'Example Park', category: 'park', description: 'A fictional park for contract tests.', latitude: 32.9, longitude: -97.2, evidenceIds: ['keller-parks'] }],
});

describe('publication readiness contracts', () => {
  it('requires an approved identity, bio and contact for the empty seller draft', () => {
    expect(sellerPublicationReadiness({ schemaVersion: 1, status: 'draft' })).toMatchObject({
      state: 'needs_content', required: ['identity', 'biography', 'contact', 'review'], optional: ['photo'],
    });
  });
  it('keeps a valid published introduction published without an optional portrait', () => {
    const profile = sellerIntroductionSchema.parse({ schemaVersion: 1, status: 'published', displayName: 'Fixture Contact', biography: 'A fictional biography used only to validate this publication contract.', email: 'fixture@example.test' });
    expect(sellerPublicationReadiness(profile)).toMatchObject({ state: 'published', required: [], optional: ['photo'] });
  });
  it('retains known identity and contact in a draft without reporting them as missing', () => {
    const profile = sellerIntroductionSchema.parse({ schemaVersion: 1, status: 'draft', displayName: 'Fixture Contact', email: 'fixture@example.test' });
    expect(sellerPublicationReadiness(profile)).toMatchObject({ state: 'needs_content', required: ['biography', 'review'] });
  });
  it('still requires deliberate publication of a complete draft', () => {
    const profile = sellerIntroductionSchema.parse({ schemaVersion: 1, status: 'draft', displayName: 'Fixture Contact', biography: 'A fictional biography used only for validating a complete draft.', email: 'fixture@example.test' });
    expect(sellerPublicationReadiness(profile)).toMatchObject({ state: 'needs_content', required: ['review'] });
  });
  it('validates supplied draft fields without relaxing required published content', () => {
    const draft = { schemaVersion: 1, status: 'draft', displayName: 'Fixture Contact', email: 'fixture@example.test' };
    expect(sellerIntroductionSchema.safeParse({ ...draft, email: 'not-an-email' }).success).toBe(false);
    expect(sellerIntroductionSchema.safeParse({ ...draft, biography: 'Too short' }).success).toBe(false);
    expect(sellerIntroductionSchema.safeParse({ ...draft, owner: 'unapproved' }).success).toBe(false);
    expect(sellerIntroductionSchema.safeParse({ ...draft, status: 'published' }).success).toBe(false);
  });
  it('does not make photography, places or map coordinates required for a text guide', () => {
    expect(guidePublicationReadiness('old_town_keller', guide(), undefined, today)).toEqual({
      key: 'old_town_keller', state: 'published', required: [], optional: ['photo', 'places', 'coordinates'], warnings: [],
    });
  });
  it('keeps optional visual drafts hidden without unpublishing the text guide', () => {
    const presentation = { ...visual(), status: 'draft' as const };
    expect(guidePublicationReadiness('old_town_keller', guide(), presentation, today)).toMatchObject({ state: 'published', required: [], optional: ['photo', 'places', 'coordinates', 'review'] });
  });
  it('requires review before publishing a text draft even when its content is complete', () => {
    expect(guidePublicationReadiness('old_town_keller', { ...guide(), status: 'draft' }, undefined, today)).toMatchObject({ state: 'needs_content', required: ['review'] });
  });
  it('flags expired sections while leaving current sections published', () => {
    const record = guide();
    record.evidence.find(source => source.id === 'keller-parks')!.expiresAt = '2026-10-27';
    expect(guidePublicationReadiness('old_town_keller', record, undefined, today)).toMatchObject({ state: 'published', required: [], warnings: ['expired_sections'] });
  });
  it('requires current evidence when no public section remains', () => {
    const record = guide(); record.evidence.forEach(source => { source.expiresAt = '2026-10-27'; });
    expect(guidePublicationReadiness('old_town_keller', record, undefined, today)).toMatchObject({ state: 'needs_content', required: ['evidence'], warnings: ['expired_sections'] });
  });
  it('uses the existing inclusive expiry rule for guide and place evidence', () => {
    const record = guide(); record.evidence.forEach(source => { source.expiresAt = today; });
    expect(guidePublicationReadiness('old_town_keller', record, visual(), today)).toMatchObject({ state: 'published', optional: ['photo'], warnings: [] });
  });
  it('does not count places with missing evidence toward map readiness', () => {
    const presentation = visual(); presentation.places[0].evidenceIds = ['not-in-guide'];
    expect(guidePublicationReadiness('old_town_keller', guide(), presentation, today)).toMatchObject({ state: 'published', optional: ['photo', 'places', 'coordinates'], warnings: ['expired_places'] });
  });
  it('validates credits, image metadata and coordinates with the existing presentation schema', () => {
    const photo = { src: '/images/neighborhoods/old-town-keller/example.webp', alt: 'A fictional park photo', width: 1200, height: 800, caption: 'A fictional caption.', credit: 'Fixture Owner' };
    expect(neighborhoodPresentationSchema.safeParse({ ...visual(), cover: photo }).success).toBe(true);
    expect(neighborhoodPresentationSchema.safeParse({ ...visual(), cover: { ...photo, credit: '' } }).success).toBe(false);
    expect(neighborhoodPresentationSchema.safeParse({ ...visual(), map: { latitude: 91, longitude: 0, zoom: 12 } }).success).toBe(false);
  });
  it('rejects incomplete or duplicate reports and inconsistent publication states', () => {
    const report = { checkedAt: '2026-10-28T12:00:00.000Z', items: publicationCatalog.map(item => unavailablePublication(item.key)) };
    expect(publicationReadinessSchema.safeParse(report).success).toBe(true);
    expect(publicationReadinessSchema.safeParse({ ...report, items: [] }).success).toBe(false);
    expect(publicationReadinessSchema.safeParse({ ...report, items: report.items.map(() => report.items[0]) }).success).toBe(false);
    expect(publicationReadinessSchema.safeParse({ ...report, items: [{ ...report.items[0], state: 'published', required: ['contact'] }, ...report.items.slice(1)] }).success).toBe(false);
    expect(publicationReadinessSchema.safeParse({ ...report, items: [{ ...report.items[0], optional: ['photo'] }, ...report.items.slice(1)] }).success).toBe(false);
  });
});
