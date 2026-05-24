import { z } from 'zod';

export const BookingReportStatusSchema = z.enum(['PENDING','DISMISSED','BLOCKED']);

export type BookingReportStatusType = `${z.infer<typeof BookingReportStatusSchema>}`

export default BookingReportStatusSchema;
