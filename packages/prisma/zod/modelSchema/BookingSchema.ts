import { z } from 'zod';
import { JsonValueSchema } from '../inputTypeSchemas/JsonValueSchema'
import { BookingStatusSchema } from '../inputTypeSchemas/BookingStatusSchema'
import { CreationSourceSchema } from '../inputTypeSchemas/CreationSourceSchema'
import { emailSchema } from '../../zod-utils'
import { bookingResponses } from '../../zod-utils'
import { bookingMetadataSchema } from '../../zod-utils'

/////////////////////////////////////////
// BOOKING SCHEMA
/////////////////////////////////////////

export const BookingSchema = z.object({
  status: BookingStatusSchema,
  creationSource: CreationSourceSchema.nullable(),
  id: z.number().int(),
  uid: z.string(),
  idempotencyKey: z.string().nullable(),
  userId: z.number().int().nullable(),
  userPrimaryEmail: emailSchema.nullable(),
  eventTypeId: z.number().int().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  customInputs: JsonValueSchema.nullable(),
  responses: bookingResponses.nullable(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  location: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date().nullable(),
  paid: z.boolean(),
  destinationCalendarId: z.number().int().nullable(),
  cancellationReason: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  reassignReason: z.string().nullable(),
  reassignById: z.number().int().nullable(),
  dynamicEventSlugRef: z.string().nullable(),
  dynamicGroupSlugRef: z.string().nullable(),
  rescheduled: z.boolean().nullable(),
  fromReschedule: z.string().nullable(),
  recurringEventId: z.string().nullable(),
  smsReminderNumber: z.string().nullable(),
  scheduledJobs: z.string().array(),
  metadata: bookingMetadataSchema.nullable(),
  isRecorded: z.boolean(),
  iCalUID: z.string().nullable(),
  iCalSequence: z.number().int(),
  rating: z.number().int().nullable(),
  ratingFeedback: z.string().nullable(),
  noShowHost: z.boolean().nullable(),
  oneTimePassword: z.string().uuid().nullable(),
  cancelledBy: emailSchema.nullable(),
  rescheduledBy: emailSchema.nullable(),
})

export type Booking = z.infer<typeof BookingSchema>

export default BookingSchema;
