import { z } from 'zod';
import { CreditTypeSchema } from '../inputTypeSchemas/CreditTypeSchema'
import { CreditUsageTypeSchema } from '../inputTypeSchemas/CreditUsageTypeSchema'

/////////////////////////////////////////
// CREDIT EXPENSE LOG SCHEMA
/////////////////////////////////////////

export const CreditExpenseLogSchema = z.object({
  creditType: CreditTypeSchema,
  creditFor: CreditUsageTypeSchema.nullable(),
  id: z.string().uuid(),
  creditBalanceId: z.string(),
  bookingUid: z.string().nullable(),
  credits: z.number().int().nullable(),
  date: z.coerce.date(),
  smsSid: z.string().nullable(),
  smsSegments: z.number().int().nullable(),
  phoneNumber: z.string().nullable(),
  email: z.string().nullable(),
  callDuration: z.number().int().nullable(),
  externalRef: z.string().nullable(),
})

export type CreditExpenseLog = z.infer<typeof CreditExpenseLogSchema>

export default CreditExpenseLogSchema;
