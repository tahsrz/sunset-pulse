import { z } from 'zod';

/////////////////////////////////////////
// BOOKING REFERENCE SCHEMA
/////////////////////////////////////////

export const BookingReferenceSchema = z.object({
  id: z.number().int(),
  type: z.string().min(1),
  uid: z.string().min(1),
  meetingId: z.string().nullable(),
  thirdPartyRecurringEventId: z.string().nullable(),
  meetingPassword: z.string().nullable(),
  meetingUrl: z.string().nullable(),
  bookingId: z.number().int().nullable(),
  externalCalendarId: z.string().nullable(),
  deleted: z.boolean().nullable(),
  credentialId: z.number().int().nullable(),
  delegationCredentialId: z.string().nullable(),
})

export type BookingReference = z.infer<typeof BookingReferenceSchema>

export default BookingReferenceSchema;
