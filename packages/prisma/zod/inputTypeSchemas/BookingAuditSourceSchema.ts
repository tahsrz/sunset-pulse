import { z } from 'zod';

export const BookingAuditSourceSchema = z.enum(['API_V1','API_V2','WEBAPP','WEBHOOK','SYSTEM','MAGIC_LINK','UNKNOWN']);

export type BookingAuditSourceType = `${z.infer<typeof BookingAuditSourceSchema>}`

export default BookingAuditSourceSchema;
