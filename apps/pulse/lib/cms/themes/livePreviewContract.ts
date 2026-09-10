import { z } from 'zod';
import { cmsPageDraftSchema } from '@/lib/cms/pages/pageSchema';

export const livePreviewUpdateSchema = z.object({
  type: z.literal('cms-preview:update'),
  channel: z.string().min(1).max(100),
  sequence: z.number().int().nonnegative(),
  draft: cmsPageDraftSchema,
  themeId: z.string(),
});
export const livePreviewReadySchema = z.object({
  type: z.literal('cms-preview:ready'),
  channel: z.string(),
});
