import { z } from 'zod';

export const CreationSourceSchema = z.enum(['API_V1','API_V2','WEBAPP']);

export type CreationSourceType = `${z.infer<typeof CreationSourceSchema>}`

export default CreationSourceSchema;
