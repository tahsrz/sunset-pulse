import 'server-only';

import oldTownKeller from '@/content/neighborhoods/old-town-keller.v1.json';
import westBurseyRanch from '@/content/neighborhoods/west-bursey-ranch.v1.json';
import westlakeOverview from '@/content/neighborhoods/westlake-overview.v1.json';
import { hasCurrentGuideEvidence, neighborhoodGuideSchema } from '@/lib/marketing/neighborhoodGuideSchema';

const guideSources = { 'old-town-keller': oldTownKeller, 'west-bursey-ranch': westBurseyRanch, 'westlake-overview': westlakeOverview };

export function getReviewedNeighborhoodGuide(slug: string) {
  if (!Object.prototype.hasOwnProperty.call(guideSources, slug)) return null;
  const guide = neighborhoodGuideSchema.parse(guideSources[slug as keyof typeof guideSources]);
  if (guide.slug !== slug) throw new Error('Guide slug does not match its source.');
  return guide;
}

export function listPublishedNeighborhoodGuides() {
  const today = new Date().toISOString().slice(0, 10);
  const reviewedGuides = Object.keys(guideSources).map(slug => getReviewedNeighborhoodGuide(slug)!)
    .filter(guide => guide.status === 'published');
  return reviewedGuides.map((guide) => ({
    ...guide,
    sections: guide.sections.filter(section => hasCurrentGuideEvidence(guide, section.evidenceIds, today)),
  })).filter((guide) => guide.sections.length > 0);
}

export function getPublishedNeighborhoodGuide(slug: string) {
  return listPublishedNeighborhoodGuides().find((guide) => guide.slug === slug) ?? null;
}
