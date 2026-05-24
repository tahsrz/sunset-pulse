import { z } from 'zod';

/////////////////////////////////////////
// AVAILABILITY SCHEMA
/////////////////////////////////////////

export const AvailabilitySchema = z.object({
  id: z.number().int(),
  userId: z.number().int().nullable(),
  eventTypeId: z.number().int().nullable(),
  days: z.number().int().array(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  date: z.coerce.date().nullable(),
  scheduleId: z.number().int().nullable(),
})

export type Availability = z.infer<typeof AvailabilitySchema>

export default AvailabilitySchema;
