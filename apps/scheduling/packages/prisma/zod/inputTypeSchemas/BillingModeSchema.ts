import { z } from 'zod';

export const BillingModeSchema = z.enum(['SEATS','ACTIVE_USERS']);

export type BillingModeType = `${z.infer<typeof BillingModeSchema>}`

export default BillingModeSchema;
