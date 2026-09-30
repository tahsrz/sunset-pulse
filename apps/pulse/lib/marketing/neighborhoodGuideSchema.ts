import { z } from 'zod';

const evidenceSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  publisher: z.string().trim().min(2).max(120),
  title: z.string().trim().min(3).max(180),
  sourceUrl: z.string().url().max(500).refine((value) => new URL(value).protocol === 'https:'),
  retrievedAt: z.string().date(),
  expiresAt: z.string().date().optional(),
  verificationStatus: z.enum(['official-reference', 'context-only']),
  scope: z.string().trim().min(8).max(500),
}).strict().superRefine((evidence, context) => {
  if (evidence.expiresAt && evidence.expiresAt < evidence.retrievedAt) {
    context.addIssue({ code: 'custom', path: ['expiresAt'], message: 'Evidence cannot expire before it was retrieved.' });
  }
});

const sectionSchema = z.object({
  heading: z.string().trim().min(3).max(100),
  paragraphs: z.array(z.string().trim().min(8).max(1200)).min(1).max(8),
  evidenceIds: z.array(z.string().regex(/^[a-z0-9-]+$/)).max(8),
  statusNote: z.string().trim().max(300).optional(),
}).strict();

export const neighborhoodGuideSchema = z.object({
  schemaVersion: z.literal(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(8).max(140),
  summary: z.string().trim().min(20).max(300),
  areaKey: z.literal('keller-westlake'),
  coverageType: z.enum(['city', 'neighborhood']),
  status: z.enum(['draft', 'published']),
  revision: z.number().int().positive(),
  reviewedAt: z.string().date(),
  sections: z.array(sectionSchema).min(2).max(12),
  evidence: z.array(evidenceSchema).min(1).max(20),
}).strict().superRefine((guide, context) => {
  const evidenceIds = new Set(guide.evidence.map((item) => item.id));
  guide.sections.forEach((section, index) => {
    section.evidenceIds.forEach((id) => {
      if (!evidenceIds.has(id)) context.addIssue({ code: 'custom', path: ['sections', index, 'evidenceIds'], message: `Unknown evidence reference: ${id}` });
    });
  });
});

export type NeighborhoodGuide = z.infer<typeof neighborhoodGuideSchema>;
