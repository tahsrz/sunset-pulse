import { z } from 'zod';
import { JsonValueSchema } from '../inputTypeSchemas/JsonValueSchema'

/////////////////////////////////////////
// CALENDAR CACHE SCHEMA
/////////////////////////////////////////

export const CalendarCacheSchema = z.object({
  id: z.string().uuid().nullable(),
  key: z.string(),
  value: JsonValueSchema,
  expiresAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  credentialId: z.number().int(),
  userId: z.number().int().nullable(),
})

export type CalendarCache = z.infer<typeof CalendarCacheSchema>

export default CalendarCacheSchema;
