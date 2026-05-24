import { z } from 'zod';

export const PaymentOptionSchema = z.enum(['ON_BOOKING','HOLD']);

export type PaymentOptionType = `${z.infer<typeof PaymentOptionSchema>}`

export default PaymentOptionSchema;
