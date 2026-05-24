import { z } from 'zod';
import { AttributeTypeSchema } from '../inputTypeSchemas/AttributeTypeSchema'

/////////////////////////////////////////
// ATTRIBUTE SCHEMA
/////////////////////////////////////////

export const AttributeSchema = z.object({
  type: AttributeTypeSchema,
  id: z.string().uuid(),
  teamId: z.number().int(),
  name: z.string(),
  slug: z.string(),
  enabled: z.boolean(),
  usersCanEditRelation: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  isWeightsEnabled: z.boolean(),
  isLocked: z.boolean(),
})

export type Attribute = z.infer<typeof AttributeSchema>

export default AttributeSchema;
