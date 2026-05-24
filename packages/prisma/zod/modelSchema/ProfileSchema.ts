import { z } from 'zod';

/////////////////////////////////////////
// PROFILE SCHEMA
/////////////////////////////////////////

export const ProfileSchema = z.object({
  id: z.number().int(),
  uid: z.string(),
  userId: z.number().int(),
  organizationId: z.number().int(),
  username: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Profile = z.infer<typeof ProfileSchema>

export default ProfileSchema;
