import { z } from 'zod';

/////////////////////////////////////////
// ACCESS TOKEN SCHEMA
/////////////////////////////////////////

export const AccessTokenSchema = z.object({
  id: z.number().int(),
  secret: z.string(),
  createdAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
  platformOAuthClientId: z.string(),
  userId: z.number().int(),
})

export type AccessToken = z.infer<typeof AccessTokenSchema>

export default AccessTokenSchema;
