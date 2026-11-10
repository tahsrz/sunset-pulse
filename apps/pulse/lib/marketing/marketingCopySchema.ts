import { z } from 'zod';

const text = (max: number) => z.string().min(1).max(max).refine(value => value.trim().length > 0, 'Enter some text.');
const heading = z.object({ title: text(200), tagline: text(400) }).strict();
const feature = heading.extend({ description: text(2000) }).strict();

export const marketingCopySchema = z.object({
  hero: z.object({ title: text(200), subtitle: text(400), description: text(2000) }).strict(),
  section_headers: z.object({ value_prop: heading, featured: heading }).strict(),
  features: z.object({ mls_efficiency: feature, spatial_search: feature, backend_integrity: feature }).strict(),
  cta: z.object({ button_text: text(100), footer_note: text(400) }).strict(),
  faq: z.object({
    title: text(200),
    items: z.array(z.object({ question: text(400), answer: text(4000) }).strict()).min(1).max(40),
  }).strict(),
}).strict();

export type MarketingCopy = z.infer<typeof marketingCopySchema>;

export function serializeMarketingCopyDraft(input: unknown): string {
  return `${JSON.stringify(marketingCopySchema.parse(input), null, 2)}\n`;
}
