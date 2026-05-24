import { z } from 'zod';

export const SeatChangeTypeSchema = z.enum(['ADDITION','REMOVAL']);

export type SeatChangeTypeType = `${z.infer<typeof SeatChangeTypeSchema>}`

export default SeatChangeTypeSchema;
