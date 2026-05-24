import { z } from 'zod';

/////////////////////////////////////////
// VERIFIED NUMBER SCHEMA
/////////////////////////////////////////

export const VerifiedNumberSchema = z.object({
  id: z.number().int(),
  userId: z.number().int().nullable(),
  teamId: z.number().int().nullable(),
  phoneNumber: z.string(),
})

export type VerifiedNumber = z.infer<typeof VerifiedNumberSchema>

export default VerifiedNumberSchema;
