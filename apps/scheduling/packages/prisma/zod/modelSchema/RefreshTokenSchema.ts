import { z } from 'zod';

/////////////////////////////////////////
// REFRESH TOKEN SCHEMA
/////////////////////////////////////////

export const RefreshTokenSchema = z.object({
  id: z.number().int(),
  secret: z.string(),
  createdAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
  platformOAuthClientId: z.string(),
  userId: z.number().int(),
})

export type RefreshToken = z.infer<typeof RefreshTokenSchema>

export default RefreshTokenSchema;
