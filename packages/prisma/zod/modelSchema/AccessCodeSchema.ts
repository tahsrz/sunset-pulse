import { z } from 'zod';
import { AccessScopeSchema } from '../inputTypeSchemas/AccessScopeSchema'

/////////////////////////////////////////
// ACCESS CODE SCHEMA
/////////////////////////////////////////

export const AccessCodeSchema = z.object({
  scopes: AccessScopeSchema.array(),
  id: z.number().int(),
  code: z.string(),
  clientId: z.string().nullable(),
  expiresAt: z.coerce.date(),
  userId: z.number().int().nullable(),
  teamId: z.number().int().nullable(),
  codeChallenge: z.string().nullable(),
  codeChallengeMethod: z.string().nullable(),
})

export type AccessCode = z.infer<typeof AccessCodeSchema>

export default AccessCodeSchema;
