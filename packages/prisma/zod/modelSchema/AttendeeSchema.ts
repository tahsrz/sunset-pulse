import { z } from 'zod';

/////////////////////////////////////////
// ATTENDEE SCHEMA
/////////////////////////////////////////

export const AttendeeSchema = z.object({
  id: z.number().int(),
  email: z.string(),
  name: z.string(),
  timeZone: z.string(),
  phoneNumber: z.string().nullable(),
  locale: z.string().nullable(),
  bookingId: z.number().int().nullable(),
  noShow: z.boolean().nullable(),
})

export type Attendee = z.infer<typeof AttendeeSchema>

export default AttendeeSchema;
