import { z } from 'zod';

/////////////////////////////////////////
// SECONDARY EMAIL SCHEMA
/////////////////////////////////////////

export const SecondaryEmailSchema = z.object({
  id: z.number().int(),
  userId: z.number().int(),
  email: z.string(),
  emailVerified: z.coerce.date().nullable(),
})

export type SecondaryEmail = z.infer<typeof SecondaryEmailSchema>

export default SecondaryEmailSchema;
