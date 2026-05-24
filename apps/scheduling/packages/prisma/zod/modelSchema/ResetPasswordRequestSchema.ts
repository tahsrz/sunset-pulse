import { z } from 'zod';

/////////////////////////////////////////
// RESET PASSWORD REQUEST SCHEMA
/////////////////////////////////////////

export const ResetPasswordRequestSchema = z.object({
  id: z.string().cuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  email: z.string(),
  expires: z.coerce.date(),
})

export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>

export default ResetPasswordRequestSchema;
