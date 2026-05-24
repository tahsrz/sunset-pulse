import { z } from 'zod';

/////////////////////////////////////////
// USER PASSWORD SCHEMA
/////////////////////////////////////////

export const UserPasswordSchema = z.object({
  hash: z.string(),
  userId: z.number().int(),
})

export type UserPassword = z.infer<typeof UserPasswordSchema>

export default UserPasswordSchema;
