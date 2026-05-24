import { z } from 'zod';

/////////////////////////////////////////
// TRAVEL SCHEDULE SCHEMA
/////////////////////////////////////////

export const TravelScheduleSchema = z.object({
  id: z.number().int(),
  userId: z.number().int(),
  timeZone: z.string(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable(),
  prevTimeZone: z.string().nullable(),
})

export type TravelSchedule = z.infer<typeof TravelScheduleSchema>

export default TravelScheduleSchema;
