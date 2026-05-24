import { z } from 'zod';
import { JsonValueSchema } from '../inputTypeSchemas/JsonValueSchema'
import { bookingSeatDataSchema } from '../../zod-utils'

/////////////////////////////////////////
// BOOKING SEAT SCHEMA
/////////////////////////////////////////

export const BookingSeatSchema = z.object({
  id: z.number().int(),
  referenceUid: z.string(),
  bookingId: z.number().int(),
  attendeeId: z.number().int(),
  data: bookingSeatDataSchema.nullable(),
  metadata: JsonValueSchema.nullable(),
})

export type BookingSeat = z.infer<typeof BookingSeatSchema>

export default BookingSeatSchema;
