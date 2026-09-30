import 'server-only';

import oldTownKeller from '@/content/neighborhoods/old-town-keller.v1.json';
import westBurseyRanch from '@/content/neighborhoods/west-bursey-ranch.v1.json';
import westlakeOverview from '@/content/neighborhoods/westlake-overview.v1.json';
import { neighborhoodGuideSchema, type NeighborhoodGuide } from '@/lib/marketing/neighborhoodGuideSchema';

const reviewedGuides: NeighborhoodGuide[] = [oldTownKeller, westBurseyRanch, westlakeOverview]
  .map((record) => neighborhoodGuideSchema.parse(record))
  .filter((guide) => guide.status === 'published');

export function listPublishedNeighborhoodGuides() {
  const today = new Date().toISOString().slice(0, 10);
  return reviewedGuides.map((guide) => ({
    ...guide,
    sections: guide.sections.filter((section) => section.evidenceIds.every((id) => {
      const source = guide.evidence.find((item) => item.id === id);
      return source && (!source.expiresAt || source.expiresAt >= today);
    })),
  })).filter((guide) => guide.sections.length > 0);
}

export function getPublishedNeighborhoodGuide(slug: string) {
  return listPublishedNeighborhoodGuides().find((guide) => guide.slug === slug) ?? null;
}
