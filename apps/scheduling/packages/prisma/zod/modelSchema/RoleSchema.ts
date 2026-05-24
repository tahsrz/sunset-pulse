import { z } from 'zod';
import { RoleTypeSchema } from '../inputTypeSchemas/RoleTypeSchema'

/////////////////////////////////////////
// ROLE SCHEMA
/////////////////////////////////////////

export const RoleSchema = z.object({
  type: RoleTypeSchema,
  id: z.string().cuid(),
  name: z.string(),
  color: z.string().nullable(),
  description: z.string().nullable(),
  teamId: z.number().int().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Role = z.infer<typeof RoleSchema>

export default RoleSchema;
