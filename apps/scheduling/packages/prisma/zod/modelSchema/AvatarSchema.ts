import { z } from 'zod';

/////////////////////////////////////////
// AVATAR SCHEMA
/////////////////////////////////////////

export const AvatarSchema = z.object({
  teamId: z.number().int(),
  userId: z.number().int(),
  data: z.string(),
  objectKey: z.string(),
  isBanner: z.boolean(),
})

export type Avatar = z.infer<typeof AvatarSchema>

export default AvatarSchema;
