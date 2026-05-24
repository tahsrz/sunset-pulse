import { z } from 'zod';

export const CalendarCacheEventStatusSchema = z.enum(['confirmed','tentative','cancelled']);

export type CalendarCacheEventStatusType = `${z.infer<typeof CalendarCacheEventStatusSchema>}`

export default CalendarCacheEventStatusSchema;
