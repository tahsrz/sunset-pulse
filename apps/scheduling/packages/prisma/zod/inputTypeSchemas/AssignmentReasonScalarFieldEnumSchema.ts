import { z } from 'zod';

export const AssignmentReasonScalarFieldEnumSchema = z.enum(['id','createdAt','bookingId','reasonEnum','reasonString']);

export default AssignmentReasonScalarFieldEnumSchema;
