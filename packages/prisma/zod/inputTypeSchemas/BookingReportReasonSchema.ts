import { z } from 'zod';

export const BookingReportReasonSchema = z.enum(['SPAM','DONT_KNOW_PERSON','OTHER']);

export type BookingReportReasonType = `${z.infer<typeof BookingReportReasonSchema>}`

export default BookingReportReasonSchema;
