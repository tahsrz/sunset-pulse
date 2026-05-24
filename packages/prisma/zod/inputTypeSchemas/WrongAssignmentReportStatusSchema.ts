import { z } from 'zod';

export const WrongAssignmentReportStatusSchema = z.enum(['PENDING','REVIEWED','RESOLVED','DISMISSED']);

export type WrongAssignmentReportStatusType = `${z.infer<typeof WrongAssignmentReportStatusSchema>}`

export default WrongAssignmentReportStatusSchema;
