import { z } from 'zod';

export const AssignmentReasonEnumSchema = z.enum(['REASSIGNED','RR_REASSIGNED','REROUTED','SALESFORCE_ASSIGNMENT']);

export type AssignmentReasonEnumType = `${z.infer<typeof AssignmentReasonEnumSchema>}`

export default AssignmentReasonEnumSchema;
