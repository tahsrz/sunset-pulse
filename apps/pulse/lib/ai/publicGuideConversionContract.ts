import { z } from 'zod';

export const PUBLIC_GUIDE_DISPOSITIONS = [
  { id: 'unassigned', label: 'Not assigned' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'tour_planned', label: 'Tour planned' },
  { id: 'closed_won', label: 'Closed won' },
  { id: 'closed_lost', label: 'Closed lost' },
] as const;

export const PUBLIC_GUIDE_DISPOSITION_IDS = PUBLIC_GUIDE_DISPOSITIONS.map(
  (disposition) => disposition.id,
) as [PublicGuideDispositionId, ...PublicGuideDispositionId[]];

export type PublicGuideDispositionId = typeof PUBLIC_GUIDE_DISPOSITIONS[number]['id'];

export const publicGuideDispositionIdSchema = z.enum(PUBLIC_GUIDE_DISPOSITION_IDS);

export const publicGuideDispositionMetadataSchema = z.object({
  value: publicGuideDispositionIdSchema,
  at: z.string().datetime(),
}).passthrough();

export function getPublicGuideDispositionLabel(disposition: PublicGuideDispositionId) {
  return PUBLIC_GUIDE_DISPOSITIONS.find((candidate) => candidate.id === disposition)?.label
    || 'Not assigned';
}

export function readPublicGuideDisposition(metadata: unknown): PublicGuideDispositionId {
  if (!metadata || typeof metadata !== 'object') return 'unassigned';
  const result = publicGuideDispositionMetadataSchema.safeParse(
    (metadata as Record<string, unknown>).publicGuideDisposition,
  );
  return result.success ? result.data.value : 'unassigned';
}
