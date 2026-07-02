import { z } from 'zod';

export const WorkflowReminderScalarFieldEnumSchema = z.enum(['id','bookingUid','method','scheduledDate','referenceId','scheduled','workflowStepId','cancelled','seatReferenceId','isMandatoryReminder','retryCount','uuid']);

export default WorkflowReminderScalarFieldEnumSchema;
