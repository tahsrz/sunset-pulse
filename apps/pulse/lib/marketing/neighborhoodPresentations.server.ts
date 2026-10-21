import 'server-only';

import presentationFile from '@/content/neighborhoods/presentation.v1.json';
import { listPublishedNeighborhoodGuides } from '@/lib/marketing/neighborhoodGuides.server';
import { neighborhoodPresentationSchema, type PublishedNeighborhoodPresentation } from '@/lib/marketing/neighborhoodPresentation';
import { z } from 'zod';

const presentationCollectionSchema = z.object({
  schemaVersion: z.literal(1),
  records: z.array(neighborhoodPresentationSchema).max(100),
}).strict().superRefine((collection, context) => {
  const slugs = new Set<string>();
  collection.records.forEach((record, index) => {
    if (slugs.has(record.slug)) context.addIssue({ code: 'custom', path: ['records', index, 'slug'], message: 'Guide presentation slugs must be unique.' });
    slugs.add(record.slug);
  });
});

export function listPublishedNeighborhoodPresentations(): PublishedNeighborhoodPresentation[] {
  const records = presentationCollectionSchema.parse(presentationFile).records;
  const guides = listPublishedNeighborhoodGuides();
  const today = new Date().toISOString().slice(0, 10);
  return records.flatMap((record) => {
    const guide = guides.find((item) => item.slug === record.slug);
    if (!guide || record.status !== 'published') return [];
    const hasCurrentEvidence = (ids: string[]) => ids.every((id) => {
      const source = guide.evidence.find((item) => item.id === id);
      return Boolean(source && (!source.expiresAt || source.expiresAt >= today));
    });
    const places = record.places.filter((place) => hasCurrentEvidence(place.evidenceIds));
    const resolvedEvidenceIds = new Set(places.flatMap((place) => place.evidenceIds));
    return [{
      ...record,
      map: places.length > 0 ? record.map : undefined,
      places,
      guide,
      evidence: guide.evidence.filter((item) => resolvedEvidenceIds.has(item.id)),
    }];
  });
}

export function getPublishedNeighborhoodPresentation(slug: string) {
  return listPublishedNeighborhoodPresentations().find((item) => item.slug === slug) ?? null;
}
