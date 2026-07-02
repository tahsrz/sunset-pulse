import { z } from 'zod';
import { WorkflowContactTypeSchema } from '../inputTypeSchemas/WorkflowContactTypeSchema'

/////////////////////////////////////////
// WORKFLOW OPT OUT CONTACT SCHEMA
/////////////////////////////////////////

export const WorkflowOptOutContactSchema = z.object({
  type: WorkflowContactTypeSchema,
  id: z.number().int(),
  value: z.string(),
  optedOut: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type WorkflowOptOutContact = z.infer<typeof WorkflowOptOutContactSchema>

export default WorkflowOptOutContactSchema;
