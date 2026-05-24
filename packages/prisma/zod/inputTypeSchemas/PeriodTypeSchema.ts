import { z } from 'zod';

export const PeriodTypeSchema = z.enum(['UNLIMITED','ROLLING','ROLLING_WINDOW','RANGE']);

export type PeriodTypeType = `${z.infer<typeof PeriodTypeSchema>}`

export default PeriodTypeSchema;
