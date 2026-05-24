import { z } from 'zod';

export const CreditUsageTypeSchema = z.enum(['SMS','CAL_AI_PHONE_CALL']);

export type CreditUsageTypeType = `${z.infer<typeof CreditUsageTypeSchema>}`

export default CreditUsageTypeSchema;
