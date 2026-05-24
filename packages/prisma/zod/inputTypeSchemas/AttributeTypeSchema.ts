import { z } from 'zod';

export const AttributeTypeSchema = z.enum(['TEXT','NUMBER','SINGLE_SELECT','MULTI_SELECT']);

export type AttributeTypeType = `${z.infer<typeof AttributeTypeSchema>}`

export default AttributeTypeSchema;
