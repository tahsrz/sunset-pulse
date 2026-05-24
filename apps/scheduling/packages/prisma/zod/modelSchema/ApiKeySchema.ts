import { z } from 'zod';

/////////////////////////////////////////
// API KEY SCHEMA
/////////////////////////////////////////

export const ApiKeySchema = z.object({
  id: z.string().cuid(),
  userId: z.number().int(),
  teamId: z.number().int().nullable(),
  note: z.string().nullable(),
  createdAt: z.coerce.date(),
  expiresAt: z.coerce.date().nullable(),
  lastUsedAt: z.coerce.date().nullable(),
  hashedKey: z.string(),
  appId: z.string().nullable(),
})

export type ApiKey = z.infer<typeof ApiKeySchema>

export default ApiKeySchema;
