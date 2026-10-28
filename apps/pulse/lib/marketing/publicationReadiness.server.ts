import 'server-only';
import { loadSellerIntroduction } from './sellerIntroduction.server';
import { getReviewedNeighborhoodGuide, listPublishedNeighborhoodGuides } from './neighborhoodGuides.server';
import { listReviewedNeighborhoodPresentations } from './neighborhoodPresentations.server';
import { guidePublicationReadiness, publicationCatalog, publicationReadinessSchema, sellerPublicationReadiness, unavailablePublication } from './publicationReadiness';
import type { NeighborhoodPresentation } from './neighborhoodPresentation';

export function loadPublicationReadiness() {
  const checkedAt = new Date().toISOString();
  let presentations: NeighborhoodPresentation[] | undefined;
  let guideCollectionAvailable = false;
  // Public pages share the guide collection. Do not report their source as healthy
  // when another invalid record prevents that shared loader from completing.
  try { listPublishedNeighborhoodGuides(); guideCollectionAvailable = true; } catch { /* All guide checks remain unavailable. */ }
  try { presentations = listReviewedNeighborhoodPresentations(); } catch { /* Report a failed source separately from an absent presentation. */ }
  const items = publicationCatalog.map(item => {
    try {
      if (item.key === 'seller_profile') return sellerPublicationReadiness(loadSellerIntroduction());
      if (!guideCollectionAvailable || !presentations) return unavailablePublication(item.key);
      const guide = getReviewedNeighborhoodGuide(item.slug!);
      if (!guide) return unavailablePublication(item.key);
      return guidePublicationReadiness(item.key, guide, presentations.find(record => record.slug === item.slug), checkedAt.slice(0, 10));
    } catch { return unavailablePublication(item.key); }
  });
  return publicationReadinessSchema.parse({ checkedAt, items });
}
