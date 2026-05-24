import { z } from 'zod';
import { BookingStatusSchema } from '../inputTypeSchemas/BookingStatusSchema'

/////////////////////////////////////////
// BOOKING TIME STATUS SCHEMA
/////////////////////////////////////////

export const BookingTimeStatusSchema = z.object({
  status: BookingStatusSchema.nullable(),
  id: z.number().int(),
  uid: z.string().nullable(),
  eventTypeId: z.number().int().nullable(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  startTime: z.coerce.date().nullable(),
  endTime: z.coerce.date().nullable(),
  createdAt: z.coerce.date().nullable(),
  location: z.string().nullable(),
  paid: z.boolean().nullable(),
  rescheduled: z.boolean().nullable(),
  userId: z.number().int().nullable(),
  teamId: z.number().int().nullable(),
  eventLength: z.number().int().nullable(),
  timeStatus: z.string().nullable(),
  eventParentId: z.number().int().nullable(),
  userEmail: z.string().nullable(),
  username: z.string().nullable(),
  ratingFeedback: z.string().nullable(),
  rating: z.number().int().nullable(),
  noShowHost: z.boolean().nullable(),
  isTeamBooking: z.boolean(),
})

export type BookingTimeStatus = z.infer<typeof BookingTimeStatusSchema>

export default BookingTimeStatusSchema;
