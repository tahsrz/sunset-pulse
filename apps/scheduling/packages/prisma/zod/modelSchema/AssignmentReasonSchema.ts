import { z } from 'zod';
import { AssignmentReasonEnumSchema } from '../inputTypeSchemas/AssignmentReasonEnumSchema'

/////////////////////////////////////////
// ASSIGNMENT REASON SCHEMA
/////////////////////////////////////////

export const AssignmentReasonSchema = z.object({
  reasonEnum: AssignmentReasonEnumSchema,
  id: z.number().int(),
  createdAt: z.coerce.date(),
  bookingId: z.number().int(),
  reasonString: z.string(),
})

export type AssignmentReason = z.infer<typeof AssignmentReasonSchema>

export default AssignmentReasonSchema;
