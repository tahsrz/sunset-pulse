import { z } from 'zod';

const id = z.string().guid();
export const propertyProfilePointSchema = z.object({
  latitude: z.number().min(-85).max(85), longitude: z.number().min(-180).max(180),
}).strict();
const building = z.object({
  id, name: z.string().trim().min(1).max(80), use: z.string().trim().max(200),
  bedrooms: z.number().int().min(0).max(30).nullable(), bathrooms: z.number().min(0).max(30).nullable(),
  pin: propertyProfilePointSchema.optional(),
}).strict();
export const propertyProfileSchema = z.object({
  title: z.string().trim().min(1).max(100), area: z.string().trim().max(100),
  acres: z.number().positive().max(100_000).nullable(), summary: z.string().trim().max(1000),
  driveway: propertyProfilePointSchema.optional(), buildings: z.array(building).max(24)
    .refine(items => new Set(items.map(item => item.id)).size === items.length, 'Duplicate building.'),
}).strict();
const revision = z.number().int().min(0).max(2_147_483_647);
export const propertyProfileActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('save'), expectedRevision: revision, draft: propertyProfileSchema }).strict(),
  z.object({ action: z.literal('publish'), expectedRevision: revision, includeMap: z.boolean() }).strict(),
  z.object({ action: z.literal('revoke'), expectedRevision: revision }).strict(),
]);
export const propertyProfileStateSchema = z.object({
  revision, draft: propertyProfileSchema, published: propertyProfileSchema.nullable(), shareToken: id.nullable(),
}).strict().nullable();
export type PropertyProfile = z.infer<typeof propertyProfileSchema>;
export type PropertyProfileState = z.infer<typeof propertyProfileStateSchema>;
export type PropertyProfileAction = z.infer<typeof propertyProfileActionSchema>;
export type PropertyProfilePoint = z.infer<typeof propertyProfilePointSchema>;
