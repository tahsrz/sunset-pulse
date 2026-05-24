import { z } from 'zod';

/////////////////////////////////////////
// RATE LIMIT SCHEMA
/////////////////////////////////////////

export const RateLimitSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  apiKeyId: z.string(),
  ttl: z.number().int(),
  limit: z.number().int(),
  blockDuration: z.number().int(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type RateLimit = z.infer<typeof RateLimitSchema>

export default RateLimitSchema;
