import { z } from 'zod';

export const RRTimestampBasisSchema = z.enum(['CREATED_AT','START_TIME']);

export type RRTimestampBasisType = `${z.infer<typeof RRTimestampBasisSchema>}`

export default RRTimestampBasisSchema;
