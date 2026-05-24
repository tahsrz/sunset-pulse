import { z } from 'zod';
import { BookingReportReasonSchema } from '../inputTypeSchemas/BookingReportReasonSchema'
import { BookingReportStatusSchema } from '../inputTypeSchemas/BookingReportStatusSchema'
import { SystemReportStatusSchema } from '../inputTypeSchemas/SystemReportStatusSchema'

/////////////////////////////////////////
// BOOKING REPORT SCHEMA
/////////////////////////////////////////

export const BookingReportSchema = z.object({
  reason: BookingReportReasonSchema,
  status: BookingReportStatusSchema,
  systemStatus: SystemReportStatusSchema,
  id: z.string().uuid(),
  bookingUid: z.string(),
  bookerEmail: z.string(),
  reportedById: z.number().int().nullable(),
  organizationId: z.number().int().nullable(),
  description: z.string().nullable(),
  cancelled: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  watchlistId: z.string().nullable(),
  globalWatchlistId: z.string().nullable(),
})

export type BookingReport = z.infer<typeof BookingReportSchema>

export default BookingReportSchema;
