import { z } from 'zod';

export const RoleTypeSchema = z.enum(['SYSTEM','CUSTOM']);

export type RoleTypeType = `${z.infer<typeof RoleTypeSchema>}`

export default RoleTypeSchema;
