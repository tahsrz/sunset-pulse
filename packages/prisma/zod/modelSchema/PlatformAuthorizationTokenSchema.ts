import { z } from 'zod';

/////////////////////////////////////////
// PLATFORM AUTHORIZATION TOKEN SCHEMA
/////////////////////////////////////////

export const PlatformAuthorizationTokenSchema = z.object({
  id: z.string().cuid(),
  platformOAuthClientId: z.string(),
  userId: z.number().int(),
  createdAt: z.coerce.date(),
})

export type PlatformAuthorizationToken = z.infer<typeof PlatformAuthorizationTokenSchema>

export default PlatformAuthorizationTokenSchema;
