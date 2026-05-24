import { z } from 'zod';

/////////////////////////////////////////
// HASHED LINK SCHEMA
/////////////////////////////////////////

export const HashedLinkSchema = z.object({
  id: z.number().int(),
  link: z.string(),
  eventTypeId: z.number().int(),
  expiresAt: z.coerce.date().nullable(),
  maxUsageCount: z.number().int(),
  usageCount: z.number().int(),
})

export type HashedLink = z.infer<typeof HashedLinkSchema>

export default HashedLinkSchema;
