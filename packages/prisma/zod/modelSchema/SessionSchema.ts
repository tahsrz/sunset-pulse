import { z } from 'zod';

/////////////////////////////////////////
// SESSION SCHEMA
/////////////////////////////////////////

export const SessionSchema = z.object({
  id: z.string().cuid(),
  sessionToken: z.string(),
  userId: z.number().int(),
  expires: z.coerce.date(),
})

export type Session = z.infer<typeof SessionSchema>

export default SessionSchema;
