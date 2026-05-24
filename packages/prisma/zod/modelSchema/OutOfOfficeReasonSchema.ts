import { z } from 'zod';

/////////////////////////////////////////
// OUT OF OFFICE REASON SCHEMA
/////////////////////////////////////////

export const OutOfOfficeReasonSchema = z.object({
  id: z.number().int(),
  emoji: z.string(),
  reason: z.string(),
  enabled: z.boolean(),
  userId: z.number().int().nullable(),
})

export type OutOfOfficeReason = z.infer<typeof OutOfOfficeReasonSchema>

export default OutOfOfficeReasonSchema;
