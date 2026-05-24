import { z } from 'zod';
import { BookingStatusSchema } from '../inputTypeSchemas/BookingStatusSchema'

/////////////////////////////////////////
// BOOKING DENORMALIZED SCHEMA
/////////////////////////////////////////

export const BookingDenormalizedSchema = z.object({
  status: BookingStatusSchema,
  id: z.number().int(),
  uid: z.string(),
  eventTypeId: z.number().int().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date().nullable(),
  location: z.string().nullable(),
  paid: z.boolean(),
  rescheduled: z.boolean().nullable(),
  userId: z.number().int().nullable(),
  teamId: z.number().int().nullable(),
  eventLength: z.number().int().nullable(),
  eventParentId: z.number().int().nullable(),
  userEmail: z.string().nullable(),
  userName: z.string().nullable(),
  userUsername: z.string().nullable(),
  ratingFeedback: z.string().nullable(),
  rating: z.number().int().nullable(),
  noShowHost: z.boolean().nullable(),
  isTeamBooking: z.boolean(),
})

export type BookingDenormalized = z.infer<typeof BookingDenormalizedSchema>

export default BookingDenormalizedSchema;
