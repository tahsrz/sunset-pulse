import { z } from 'zod';

export const WrongAssignmentReportScalarFieldEnumSchema = z.enum(['id','bookingUid','reportedById','correctAssignee','additionalNotes','teamId','status','reviewedById','reviewedAt','createdAt','updatedAt']);

export default WrongAssignmentReportScalarFieldEnumSchema;
