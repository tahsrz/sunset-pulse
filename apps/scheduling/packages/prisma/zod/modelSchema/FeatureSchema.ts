import { z } from 'zod';
import { FeatureTypeSchema } from '../inputTypeSchemas/FeatureTypeSchema'

/////////////////////////////////////////
// FEATURE SCHEMA
/////////////////////////////////////////

export const FeatureSchema = z.object({
  type: FeatureTypeSchema.nullable(),
  slug: z.string(),
  enabled: z.boolean(),
  description: z.string().nullable(),
  stale: z.boolean().nullable(),
  lastUsedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
  updatedBy: z.number().int().nullable(),
})

export type Feature = z.infer<typeof FeatureSchema>

export default FeatureSchema;
