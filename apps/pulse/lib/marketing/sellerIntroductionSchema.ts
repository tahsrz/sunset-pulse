import { z } from 'zod';

const draftSchema = z.object({ schemaVersion: z.literal(1), status: z.literal('draft') }).strict();
const publishedSchema = z.object({
  schemaVersion: z.literal(1), status: z.literal('published'),
  displayName: z.string().trim().min(2).max(100),
  biography: z.string().trim().min(40).max(1200),
  portrait: z.object({
    src: z.string().regex(/^\/images\/seller-profile\/[a-z0-9-]+\.webp$/),
    alt: z.string().trim().min(8).max(180), width: z.number().int().positive().max(2400), height: z.number().int().positive().max(2400),
  }).strict().optional(),
  phone: z.string().regex(/^\+?[0-9(). -]{7,24}$/).optional(),
  email: z.string().email().max(180).optional(),
}).strict();

const checkedPublishedSchema = publishedSchema.refine((profile) => Boolean(profile.phone || profile.email), { message: 'A published profile needs a public contact method.' });
export const sellerIntroductionSchema = z.union([draftSchema, checkedPublishedSchema]);
export type PublishedSellerIntroduction = z.infer<typeof checkedPublishedSchema>;
