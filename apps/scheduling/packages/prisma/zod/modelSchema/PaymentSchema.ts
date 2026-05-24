import { z } from 'zod';
import { JsonValueSchema } from '../inputTypeSchemas/JsonValueSchema'
import { PaymentOptionSchema } from '../inputTypeSchemas/PaymentOptionSchema'

/////////////////////////////////////////
// PAYMENT SCHEMA
/////////////////////////////////////////

export const PaymentSchema = z.object({
  paymentOption: PaymentOptionSchema.nullable(),
  id: z.number().int(),
  uid: z.string(),
  appId: z.string().nullable(),
  bookingId: z.number().int(),
  amount: z.number().int(),
  fee: z.number().int(),
  currency: z.string(),
  success: z.boolean(),
  refunded: z.boolean(),
  data: JsonValueSchema,
  externalId: z.string(),
})

export type Payment = z.infer<typeof PaymentSchema>

export default PaymentSchema;
