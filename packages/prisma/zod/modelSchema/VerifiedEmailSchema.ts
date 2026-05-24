import { z } from 'zod';

/////////////////////////////////////////
// VERIFIED EMAIL SCHEMA
/////////////////////////////////////////

export const VerifiedEmailSchema = z.object({
  id: z.number().int(),
  userId: z.number().int().nullable(),
  teamId: z.number().int().nullable(),
  email: z.string(),
})

export type VerifiedEmail = z.infer<typeof VerifiedEmailSchema>

export default VerifiedEmailSchema;
