import { z } from 'zod';
import { BillingPeriodSchema } from '../inputTypeSchemas/BillingPeriodSchema'
import { BillingModeSchema } from '../inputTypeSchemas/BillingModeSchema'

/////////////////////////////////////////
// ORGANIZATION BILLING SCHEMA
/////////////////////////////////////////

export const OrganizationBillingSchema = z.object({
  billingPeriod: BillingPeriodSchema.nullable(),
  billingMode: BillingModeSchema,
  id: z.string().uuid(),
  teamId: z.number().int(),
  subscriptionId: z.string(),
  subscriptionItemId: z.string(),
  customerId: z.string(),
  status: z.string(),
  planName: z.string(),
  subscriptionStart: z.coerce.date().nullable(),
  subscriptionTrialEnd: z.coerce.date().nullable(),
  subscriptionEnd: z.coerce.date().nullable(),
  pricePerSeat: z.number().int().nullable(),
  paidSeats: z.number().int().nullable(),
  highWaterMark: z.number().int().nullable(),
  highWaterMarkPeriodStart: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type OrganizationBilling = z.infer<typeof OrganizationBillingSchema>

export default OrganizationBillingSchema;
