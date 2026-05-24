import { z } from 'zod';
import { WrongAssignmentReportStatusSchema } from '../inputTypeSchemas/WrongAssignmentReportStatusSchema'

/////////////////////////////////////////
// WRONG ASSIGNMENT REPORT SCHEMA
/////////////////////////////////////////

export const WrongAssignmentReportSchema = z.object({
  status: WrongAssignmentReportStatusSchema,
  id: z.string().uuid(),
  bookingUid: z.string(),
  reportedById: z.number().int().nullable(),
  correctAssignee: z.string().nullable(),
  additionalNotes: z.string(),
  teamId: z.number().int().nullable(),
  reviewedById: z.number().int().nullable(),
  reviewedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type WrongAssignmentReport = z.infer<typeof WrongAssignmentReportSchema>

export default WrongAssignmentReportSchema;
