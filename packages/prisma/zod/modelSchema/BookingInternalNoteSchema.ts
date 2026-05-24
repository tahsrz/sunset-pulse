import { z } from 'zod';

/////////////////////////////////////////
// BOOKING INTERNAL NOTE SCHEMA
/////////////////////////////////////////

export const BookingInternalNoteSchema = z.object({
  id: z.number().int(),
  notePresetId: z.number().int().nullable(),
  text: z.string().nullable(),
  bookingId: z.number().int(),
  createdById: z.number().int(),
  createdAt: z.coerce.date(),
})

export type BookingInternalNote = z.infer<typeof BookingInternalNoteSchema>

export default BookingInternalNoteSchema;
