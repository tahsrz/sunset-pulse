import { z } from 'zod';
import { CalendarCacheEventStatusSchema } from '../inputTypeSchemas/CalendarCacheEventStatusSchema'

/////////////////////////////////////////
// CALENDAR CACHE EVENT SCHEMA
/////////////////////////////////////////

export const CalendarCacheEventSchema = z.object({
  status: CalendarCacheEventStatusSchema,
  id: z.string().uuid(),
  selectedCalendarId: z.string(),
  externalId: z.string(),
  externalEtag: z.string(),
  iCalUID: z.string().nullable(),
  iCalSequence: z.number().int(),
  summary: z.string().nullable(),
  description: z.string().nullable(),
  location: z.string().nullable(),
  start: z.coerce.date(),
  end: z.coerce.date(),
  isAllDay: z.boolean(),
  timeZone: z.string().nullable(),
  recurringEventId: z.string().nullable(),
  originalStartTime: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  externalCreatedAt: z.coerce.date().nullable(),
  externalUpdatedAt: z.coerce.date().nullable(),
})

export type CalendarCacheEvent = z.infer<typeof CalendarCacheEventSchema>

export default CalendarCacheEventSchema;
