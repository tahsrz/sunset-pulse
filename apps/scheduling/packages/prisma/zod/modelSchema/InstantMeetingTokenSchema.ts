import { z } from 'zod';

/////////////////////////////////////////
// INSTANT MEETING TOKEN SCHEMA
/////////////////////////////////////////

export const InstantMeetingTokenSchema = z.object({
  id: z.number().int(),
  token: z.string(),
  expires: z.coerce.date(),
  teamId: z.number().int(),
  bookingId: z.number().int().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type InstantMeetingToken = z.infer<typeof InstantMeetingTokenSchema>

export default InstantMeetingTokenSchema;
