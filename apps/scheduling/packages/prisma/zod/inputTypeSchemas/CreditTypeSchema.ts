import { z } from 'zod';

export const CreditTypeSchema = z.enum(['MONTHLY','ADDITIONAL']);

export type CreditTypeType = `${z.infer<typeof CreditTypeSchema>}`

export default CreditTypeSchema;
