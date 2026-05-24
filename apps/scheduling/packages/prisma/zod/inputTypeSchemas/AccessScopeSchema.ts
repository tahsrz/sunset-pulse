import { z } from 'zod';

export const AccessScopeSchema = z.enum(['READ_BOOKING','READ_PROFILE']);

export type AccessScopeType = `${z.infer<typeof AccessScopeSchema>}`

export default AccessScopeSchema;
