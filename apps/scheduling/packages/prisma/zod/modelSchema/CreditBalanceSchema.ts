import { z } from 'zod';

/////////////////////////////////////////
// CREDIT BALANCE SCHEMA
/////////////////////////////////////////

export const CreditBalanceSchema = z.object({
  id: z.string().uuid(),
  teamId: z.number().int().nullable(),
  userId: z.number().int().nullable(),
  additionalCredits: z.number().int(),
  limitReachedAt: z.coerce.date().nullable(),
  warningSentAt: z.coerce.date().nullable(),
})

export type CreditBalance = z.infer<typeof CreditBalanceSchema>

export default CreditBalanceSchema;
