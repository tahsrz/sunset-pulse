import { z } from 'zod';

/////////////////////////////////////////
// HOLIDAY CACHE SCHEMA
/////////////////////////////////////////

export const HolidayCacheSchema = z.object({
  id: z.string().uuid(),
  countryCode: z.string(),
  calendarId: z.string(),
  eventId: z.string(),
  name: z.string(),
  date: z.coerce.date(),
  year: z.number().int(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type HolidayCache = z.infer<typeof HolidayCacheSchema>

export default HolidayCacheSchema;
