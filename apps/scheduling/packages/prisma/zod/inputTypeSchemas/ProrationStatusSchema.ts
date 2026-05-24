import { z } from 'zod';

export const ProrationStatusSchema = z.enum(['PENDING','INVOICE_CREATED','CHARGED','FAILED','CANCELLED']);

export type ProrationStatusType = `${z.infer<typeof ProrationStatusSchema>}`

export default ProrationStatusSchema;
