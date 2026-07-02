import { z } from 'zod';
import { WorkflowActionsSchema } from '../inputTypeSchemas/WorkflowActionsSchema'
import { WorkflowTemplatesSchema } from '../inputTypeSchemas/WorkflowTemplatesSchema'

/////////////////////////////////////////
// WORKFLOW STEP SCHEMA
/////////////////////////////////////////

export const WorkflowStepSchema = z.object({
  action: WorkflowActionsSchema,
  template: WorkflowTemplatesSchema,
  id: z.number().int(),
  stepNumber: z.number().int(),
  workflowId: z.number().int(),
  sendTo: z.string().nullable(),
  reminderBody: z.string().nullable(),
  emailSubject: z.string().nullable(),
  numberRequired: z.boolean().nullable(),
  sender: z.string().nullable(),
  numberVerificationPending: z.boolean(),
  includeCalendarEvent: z.boolean(),
  autoTranslateEnabled: z.boolean(),
  sourceLocale: z.string().nullable(),
  verifiedAt: z.coerce.date().nullable(),
  agentId: z.string().nullable(),
  inboundAgentId: z.string().nullable(),
})

export type WorkflowStep = z.infer<typeof WorkflowStepSchema>

export default WorkflowStepSchema;
