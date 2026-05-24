import { z } from 'zod';
import { JsonValueSchema } from '../inputTypeSchemas/JsonValueSchema'
import { ProrationStatusSchema } from '../inputTypeSchemas/ProrationStatusSchema'

/////////////////////////////////////////
// MONTHLY PRORATION SCHEMA
/////////////////////////////////////////

export const MonthlyProrationSchema = z.object({
  status: ProrationStatusSchema,
  id: z.string().uuid(),
  teamId: z.number().int(),
  monthKey: z.string(),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  seatsAtStart: z.number().int(),
  seatsAdded: z.number().int(),
  seatsRemoved: z.number().int(),
  netSeatIncrease: z.number().int(),
  seatsAtEnd: z.number().int(),
  subscriptionId: z.string(),
  subscriptionItemId: z.string(),
  customerId: z.string(),
  subscriptionStart: z.coerce.date(),
  subscriptionEnd: z.coerce.date(),
  remainingDays: z.number().int(),
  pricePerSeat: z.number().int(),
  proratedAmount: z.number().int(),
  invoiceItemId: z.string().nullable(),
  invoiceId: z.string().nullable(),
  invoiceUrl: z.string().nullable(),
  chargedAt: z.coerce.date().nullable(),
  failedAt: z.coerce.date().nullable(),
  failureReason: z.string().nullable(),
  retryCount: z.number().int(),
  metadata: JsonValueSchema.nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  teamBillingId: z.string().nullable(),
  organizationBillingId: z.string().nullable(),
})

export type MonthlyProration = z.infer<typeof MonthlyProrationSchema>

export default MonthlyProrationSchema;
