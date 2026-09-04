import { z } from 'zod';

const blockIdSchema = z.string().uuid();
const extensionIdSchema = z.string().trim().regex(/^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/);
const linkSchema = z.string().trim().max(2048).refine((value) => value.startsWith('/') || /^https?:\/\//i.test(value), 'Use a site path or HTTP(S) URL');

const blockBase = {
  blockId: blockIdSchema,
  version: z.literal(1),
};

export const headingBlockSchema = z.object({
  ...blockBase,
  type: z.literal('core/heading'),
  props: z.object({
    text: z.string().max(10_000),
    level: z.number().int().min(1).max(6).default(2),
    anchor: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  }).strict(),
}).strict();

export const paragraphBlockSchema = z.object({
  ...blockBase,
  type: z.literal('core/paragraph'),
  props: z.object({ text: z.string().max(50_000) }).strict(),
}).strict();

export const imageBlockSchema = z.object({
  ...blockBase,
  type: z.literal('core/image'),
  props: z.object({
    src: z.string().trim().url().max(2048),
    alt: z.string().trim().max(500),
    caption: z.string().trim().max(2_000).optional(),
    width: z.number().int().min(1).max(10_000).default(1200),
    height: z.number().int().min(1).max(10_000).default(800),
  }).strict(),
}).strict();

export const buttonBlockSchema = z.object({
  ...blockBase,
  type: z.literal('core/button'),
  props: z.object({
    label: z.string().trim().min(1).max(200),
    href: linkSchema,
    style: z.enum(['primary', 'secondary', 'text']).default('primary'),
  }).strict(),
}).strict();

export const cmsBlockSchema = z.discriminatedUnion('type', [
  headingBlockSchema,
  paragraphBlockSchema,
  imageBlockSchema,
  buttonBlockSchema,
]);

export const cmsPageStatusSchema = z.enum(['draft', 'published', 'trash']);

export const cmsPageDraftSchema = z.object({
  schemaVersion: z.literal(1).default(1),
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  excerpt: z.string().trim().max(500).default(''),
  templateId: extensionIdSchema.default('sunset/page'),
  blocks: z.array(cmsBlockSchema).max(250).default([]),
}).strict().superRefine((draft, context) => {
  const seen = new Set<string>();
  draft.blocks.forEach((block, index) => {
    if (seen.has(block.blockId)) {
      context.addIssue({ code: 'custom', path: ['blocks', index, 'blockId'], message: 'Block IDs must be unique within a page' });
    }
    seen.add(block.blockId);
  });
});

export type CmsBlock = z.infer<typeof cmsBlockSchema>;
export type CmsPageDraft = z.infer<typeof cmsPageDraftSchema>;
export type CmsPageStatus = z.infer<typeof cmsPageStatusSchema>;
