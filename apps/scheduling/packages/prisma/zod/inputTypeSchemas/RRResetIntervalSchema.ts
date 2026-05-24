import { z } from 'zod';

export const RRResetIntervalSchema = z.enum(['MONTH','DAY']);

export type RRResetIntervalType = `${z.infer<typeof RRResetIntervalSchema>}`

export default RRResetIntervalSchema;
