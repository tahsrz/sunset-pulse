import { z } from 'zod';

/////////////////////////////////////////
// FEEDBACK SCHEMA
/////////////////////////////////////////

export const FeedbackSchema = z.object({
  id: z.number().int(),
  date: z.coerce.date(),
  userId: z.number().int(),
  rating: z.string(),
  comment: z.string().nullable(),
})

export type Feedback = z.infer<typeof FeedbackSchema>

export default FeedbackSchema;
