import { z } from 'zod';

export const BookingAuditTypeSchema = z.enum(['RECORD_CREATED','RECORD_UPDATED','RECORD_DELETED']);

export type BookingAuditTypeType = `${z.infer<typeof BookingAuditTypeSchema>}`

export default BookingAuditTypeSchema;
