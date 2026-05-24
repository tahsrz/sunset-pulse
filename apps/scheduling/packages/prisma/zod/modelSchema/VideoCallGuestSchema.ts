import { z } from 'zod';

/////////////////////////////////////////
// VIDEO CALL GUEST SCHEMA
/////////////////////////////////////////

export const VideoCallGuestSchema = z.object({
  id: z.string().uuid(),
  bookingUid: z.string(),
  email: z.string(),
  name: z.string(),
  joinedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type VideoCallGuest = z.infer<typeof VideoCallGuestSchema>

export default VideoCallGuestSchema;
