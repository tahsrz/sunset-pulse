import { z } from 'zod';

/////////////////////////////////////////
// ATTRIBUTE TO USER SCHEMA
/////////////////////////////////////////

export const AttributeToUserSchema = z.object({
  id: z.string().uuid(),
  memberId: z.number().int(),
  attributeOptionId: z.string(),
  weight: z.number().int().nullable(),
  createdAt: z.coerce.date(),
  createdById: z.number().int().nullable(),
  createdByDSyncId: z.string().nullable(),
  updatedAt: z.coerce.date().nullable(),
  updatedById: z.number().int().nullable(),
  updatedByDSyncId: z.string().nullable(),
})

export type AttributeToUser = z.infer<typeof AttributeToUserSchema>

export default AttributeToUserSchema;
