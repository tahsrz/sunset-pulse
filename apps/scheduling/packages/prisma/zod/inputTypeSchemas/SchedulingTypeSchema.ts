import { z } from 'zod';

export const SchedulingTypeSchema = z.enum(['ROUND_ROBIN','COLLECTIVE','MANAGED']);

export type SchedulingTypeType = `${z.infer<typeof SchedulingTypeSchema>}`

export default SchedulingTypeSchema;
