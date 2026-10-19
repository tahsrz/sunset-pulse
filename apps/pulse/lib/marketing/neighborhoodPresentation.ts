import { z } from 'zod';
import type { NeighborhoodGuide } from '@/lib/marketing/neighborhoodGuideSchema';

const photoSchema = z.object({
  src: z.string().regex(/^\/images\/neighborhoods\/[a-z0-9-]+\/[a-z0-9-]+\.webp$/),
  alt: z.string().trim().min(8).max(180),
  width: z.number().int().positive().max(4000), height: z.number().int().positive().max(4000),
  caption: z.string().trim().min(5).max(220), credit: z.string().trim().min(2).max(120), capturedAt: z.string().date().optional(),
}).strict();
const placeSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/), name: z.string().trim().min(2).max(120),
  category: z.enum(['park', 'trail', 'public-place', 'business']), description: z.string().trim().min(15).max(300),
  latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), evidenceIds: z.array(z.string()).min(1).max(5),
}).strict();

export const neighborhoodPresentationSchema = z.object({
  schemaVersion: z.literal(1), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), status: z.enum(['draft', 'published']),
  cover: photoSchema.optional(), photos: z.array(photoSchema).max(6),
  map: z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), zoom: z.number().min(8).max(17) }).strict().optional(),
  places: z.array(placeSchema).max(8),
  localNote: z.object({ text: z.string().trim().min(20).max(600), author: z.string().trim().min(2).max(120), visitedAt: z.string().date() }).strict().optional(),
}).strict().superRefine((presentation, context) => {
  const ids = new Set<string>();
  presentation.places.forEach((place, index) => {
    if (ids.has(place.id)) context.addIssue({ code: 'custom', path: ['places', index, 'id'], message: 'Place IDs must be unique.' });
    ids.add(place.id);
  });
});

export type NeighborhoodPresentation = z.infer<typeof neighborhoodPresentationSchema>;
export type PublishedNeighborhoodPresentation = NeighborhoodPresentation & {
  guide: NeighborhoodGuide;
  places: NeighborhoodPresentation['places'];
  evidence: NeighborhoodGuide['evidence'];
};
