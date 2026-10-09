import { z } from 'zod';

export const videoPublicationPlatformSchema = z.enum(['tiktok', 'instagram-reels', 'youtube-shorts']);

const allowedHosts: Record<z.infer<typeof videoPublicationPlatformSchema>, readonly string[]> = {
  tiktok: ['tiktok.com'],
  'instagram-reels': ['instagram.com'],
  'youtube-shorts': ['youtube.com', 'youtu.be'],
};

export const videoPublicationRecordSchema = z.object({
  workspaceId: z.string().uuid(),
  briefId: z.string().uuid(),
  revision: z.number().int().positive().safe(),
  platform: videoPublicationPlatformSchema,
  publicUrl: z.string().trim().url().max(2_000),
  publishedAt: z.string().datetime({ offset: true }),
  requestKey: z.string().uuid(),
}).strict().superRefine((record, context) => {
  let url: URL;
  try { url = new URL(record.publicUrl); }
  catch {
    context.addIssue({ code: 'custom', path: ['publicUrl'], message: 'Enter a valid public post URL.' });
    return;
  }
  const allowed = allowedHosts[record.platform].some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`));
  if (url.protocol !== 'https:' || url.username || url.password || !allowed) {
    context.addIssue({ code: 'custom', path: ['publicUrl'], message: 'Use a public HTTPS URL from the selected social platform.' });
  }
  if (Date.parse(record.publishedAt) > Date.now()) {
    context.addIssue({ code: 'custom', path: ['publishedAt'], message: 'Publication time cannot be in the future.' });
  }
});

export type VideoPublicationRecordInput = z.infer<typeof videoPublicationRecordSchema>;
