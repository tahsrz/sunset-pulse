import { z } from 'zod';
import { MembershipRoleSchema } from '../inputTypeSchemas/MembershipRoleSchema'

/////////////////////////////////////////
// MEMBERSHIP SCHEMA
/////////////////////////////////////////

export const MembershipSchema = z.object({
  role: MembershipRoleSchema,
  id: z.number().int(),
  teamId: z.number().int(),
  userId: z.number().int(),
  accepted: z.boolean(),
  customRoleId: z.string().nullable(),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
})

export type Membership = z.infer<typeof MembershipSchema>

export default MembershipSchema;
