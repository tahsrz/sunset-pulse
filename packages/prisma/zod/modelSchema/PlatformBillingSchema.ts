import { z } from 'zod';

/////////////////////////////////////////
// PLATFORM BILLING SCHEMA
/////////////////////////////////////////

export const PlatformBillingSchema = z.object({
  id: z.number().int(),
  customerId: z.string(),
  subscriptionId: z.string().nullable(),
  priceId: z.string().nullable(),
  plan: z.string(),
  billingCycleStart: z.number().int().nullable(),
  billingCycleEnd: z.number().int().nullable(),
  overdue: z.boolean().nullable(),
  managerBillingId: z.number().int().nullable(),
})

export type PlatformBilling = z.infer<typeof PlatformBillingSchema>

export default PlatformBillingSchema;
