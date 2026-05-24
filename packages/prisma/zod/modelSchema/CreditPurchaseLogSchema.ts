import { z } from 'zod';

/////////////////////////////////////////
// CREDIT PURCHASE LOG SCHEMA
/////////////////////////////////////////

export const CreditPurchaseLogSchema = z.object({
  id: z.string().uuid(),
  creditBalanceId: z.string(),
  credits: z.number().int(),
  createdAt: z.coerce.date(),
})

export type CreditPurchaseLog = z.infer<typeof CreditPurchaseLogSchema>

export default CreditPurchaseLogSchema;
