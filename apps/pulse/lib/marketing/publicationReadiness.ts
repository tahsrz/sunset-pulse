import { z } from 'zod';
import type { SellerIntroduction } from './sellerIntroductionSchema';
import { hasCurrentGuideEvidence, type NeighborhoodGuide } from './neighborhoodGuideSchema';
import type { NeighborhoodPresentation } from './neighborhoodPresentation';

export const publicationCatalog = [
  { key: 'seller_profile', title: 'Seller Introduction', slug: null, publicHref: '/seller-plan', files: ['content/marketing/seller-introduction.v1.json'] },
  { key: 'old_town_keller', title: 'Old Town Keller', slug: 'old-town-keller', publicHref: '/neighborhoods/old-town-keller', files: ['content/neighborhoods/old-town-keller.v1.json', 'content/neighborhoods/presentation.v1.json'] },
  { key: 'west_bursey_ranch', title: 'West Bursey Ranch', slug: 'west-bursey-ranch', publicHref: '/neighborhoods/west-bursey-ranch', files: ['content/neighborhoods/west-bursey-ranch.v1.json', 'content/neighborhoods/presentation.v1.json'] },
  { key: 'westlake', title: 'Westlake', slug: 'westlake-overview', publicHref: '/neighborhoods/westlake-overview', files: ['content/neighborhoods/westlake-overview.v1.json', 'content/neighborhoods/presentation.v1.json'] },
] as const;
type CatalogItem = typeof publicationCatalog[number];
export type PublicationKey = CatalogItem['key'];

const itemSchema = z.object({
  key: z.enum(['seller_profile', 'old_town_keller', 'west_bursey_ranch', 'westlake']),
  state: z.enum(['published', 'needs_content', 'unavailable']),
  required: z.array(z.enum(['identity', 'biography', 'contact', 'review', 'evidence'])).max(5),
  optional: z.array(z.enum(['photo', 'places', 'coordinates', 'review'])).max(4),
  warnings: z.array(z.enum(['expired_sections', 'expired_places'])).max(2),
}).strict().superRefine((item, context) => {
  if ((item.state === 'published' && item.required.length > 0) || (item.state === 'needs_content' && item.required.length === 0)) {
    context.addIssue({ code: 'custom', message: 'Publication state must match its requirements.' });
  }
  if (item.state === 'unavailable' && (item.required.length || item.optional.length || item.warnings.length)) {
    context.addIssue({ code: 'custom', message: 'Unavailable content has not been assessed.' });
  }
});
export type PublicationReadinessItem = z.infer<typeof itemSchema>;
export const publicationReadinessSchema = z.object({
  checkedAt: z.string().datetime(),
  items: z.array(itemSchema).length(4).refine(items => new Set(items.map(item => item.key)).size === 4, { message: 'Every publication must be checked once.' }),
}).strict();
export type PublicationReadinessReport = z.infer<typeof publicationReadinessSchema>;

export function unavailablePublication(key: PublicationKey): PublicationReadinessItem {
  return { key, state: 'unavailable', required: [], optional: [], warnings: [] };
}

export function sellerPublicationReadiness(profile: SellerIntroduction): PublicationReadinessItem {
  return profile.status === 'draft'
    ? { key: 'seller_profile', state: 'needs_content', required: ['identity', 'biography', 'contact', 'review'], optional: ['photo'], warnings: [] }
    : { key: 'seller_profile', state: 'published', required: [], optional: profile.portrait ? [] : ['photo'], warnings: [] };
}

export function guidePublicationReadiness(key: PublicationKey, guide: NeighborhoodGuide, presentation: NeighborhoodPresentation | undefined, today: string): PublicationReadinessItem {
  const currentSections = guide.sections.filter(section => hasCurrentGuideEvidence(guide, section.evidenceIds, today));
  const required: PublicationReadinessItem['required'] = [];
  if (guide.status !== 'published') required.push('review');
  if (currentSections.length === 0) required.push('evidence');
  const warnings: PublicationReadinessItem['warnings'] = currentSections.length < guide.sections.length ? ['expired_sections'] : [];
  const optional: PublicationReadinessItem['optional'] = [];
  const visiblePresentation = presentation?.status === 'published' ? presentation : undefined;
  const places = visiblePresentation?.places.filter(place => hasCurrentGuideEvidence(guide, place.evidenceIds, today)) ?? [];
  if (visiblePresentation && places.length < visiblePresentation.places.length) warnings.push('expired_places');
  if (!visiblePresentation?.cover && !visiblePresentation?.photos.length) optional.push('photo');
  if (!places.length) optional.push('places');
  if (!visiblePresentation?.map || !places.length) optional.push('coordinates');
  if (presentation?.status === 'draft') optional.push('review');
  return { key, state: required.length ? 'needs_content' : 'published', required, optional, warnings };
}
