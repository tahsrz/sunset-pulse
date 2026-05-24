import { z } from 'zod';

export const BillingPeriodSchema = z.enum(['MONTHLY','ANNUALLY']);

export type BillingPeriodType = `${z.infer<typeof BillingPeriodSchema>}`

export default BillingPeriodSchema;
