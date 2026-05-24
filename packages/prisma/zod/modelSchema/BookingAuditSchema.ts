import { z } from 'zod';
import { JsonValueSchema } from '../inputTypeSchemas/JsonValueSchema'
import { BookingAuditTypeSchema } from '../inputTypeSchemas/BookingAuditTypeSchema'
import { BookingAuditActionSchema } from '../inputTypeSchemas/BookingAuditActionSchema'
import { BookingAuditSourceSchema } from '../inputTypeSchemas/BookingAuditSourceSchema'

/////////////////////////////////////////
// BOOKING AUDIT SCHEMA
/////////////////////////////////////////

export const BookingAuditSchema = z.object({
  type: BookingAuditTypeSchema,
  action: BookingAuditActionSchema,
  source: BookingAuditSourceSchema,
  id: z.string().uuid(),
  bookingUid: z.string(),
  actorId: z.string(),
  timestamp: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  operationId: z.string(),
  data: JsonValueSchema.nullable(),
  context: JsonValueSchema.nullable(),
})

export type BookingAudit = z.infer<typeof BookingAuditSchema>

export default BookingAuditSchema;
