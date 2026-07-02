import { z } from 'zod';
import { WorkflowMethodsSchema } from '../inputTypeSchemas/WorkflowMethodsSchema'

/////////////////////////////////////////
// WORKFLOW REMINDER SCHEMA
/////////////////////////////////////////

export const WorkflowReminderSchema = z.object({
  method: WorkflowMethodsSchema,
  id: z.number().int(),
  bookingUid: z.string().nullable(),
  scheduledDate: z.coerce.date(),
  referenceId: z.string().nullable(),
  scheduled: z.boolean(),
  workflowStepId: z.number().int().nullable(),
  cancelled: z.boolean().nullable(),
  seatReferenceId: z.string().nullable(),
  isMandatoryReminder: z.boolean().nullable(),
  retryCount: z.number().int(),
  uuid: z.string().nullable(),
})

export type WorkflowReminder = z.infer<typeof WorkflowReminderSchema>

export default WorkflowReminderSchema;
