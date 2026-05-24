import { z } from 'zod';

/////////////////////////////////////////
// SCHEDULE SCHEMA
/////////////////////////////////////////

export const ScheduleSchema = z.object({
  id: z.number().int(),
  userId: z.number().int(),
  name: z.string(),
  timeZone: z.string().nullable(),
})

export type Schedule = z.infer<typeof ScheduleSchema>

export default ScheduleSchema;
