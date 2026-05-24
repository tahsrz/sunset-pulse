import { z } from 'zod';

export const TimeUnitSchema = z.enum(['DAY','HOUR','MINUTE']);

export type TimeUnitType = `${z.infer<typeof TimeUnitSchema>}`

export default TimeUnitSchema;
