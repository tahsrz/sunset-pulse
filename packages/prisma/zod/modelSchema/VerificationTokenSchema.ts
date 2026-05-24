import { z } from 'zod';

/////////////////////////////////////////
// VERIFICATION TOKEN SCHEMA
/////////////////////////////////////////

export const VerificationTokenSchema = z.object({
  id: z.number().int(),
  identifier: z.string(),
  token: z.string(),
  expires: z.coerce.date(),
  expiresInDays: z.number().int().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  teamId: z.number().int().nullable(),
  secondaryEmailId: z.number().int().nullable(),
})

export type VerificationToken = z.infer<typeof VerificationTokenSchema>

export default VerificationTokenSchema;
