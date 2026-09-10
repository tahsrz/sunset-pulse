import { z } from 'zod';

const text = z.string().max(5000);
const href = z.string().max(2048).refine((value) => !value || /^\/(?!\/)/.test(value) || /^https?:\/\//i.test(value), 'Use a site path or HTTP(S) URL');
export const homepageSectionSchema = z.object({
  blockId: z.string().uuid(),
  version: z.literal(1),
  type: z.literal('sunset/section'),
  props: z.object({
    layout: z.enum(['hero', 'destinations', 'story', 'faq', 'closing']),
    eyebrow: z.string().max(200),
    heading: z.string().max(500),
    text,
    actionLabel: z.string().max(200),
    actionHref: href,
    items: z.array(z.object({
      title: z.string().max(500), text,
      linkLabel: z.string().max(200), href,
    }).strict()).max(12),
  }).strict(),
}).strict();
export type HomepageSectionBlock = z.infer<typeof homepageSectionSchema>;
