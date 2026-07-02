import { z } from 'zod';

/////////////////////////////////////////
// WORKFLOWS ON EVENT TYPES SCHEMA
/////////////////////////////////////////

export const WorkflowsOnEventTypesSchema = z.object({
  id: z.number().int(),
  workflowId: z.number().int(),
  eventTypeId: z.number().int(),
})

export type WorkflowsOnEventTypes = z.infer<typeof WorkflowsOnEventTypesSchema>

export default WorkflowsOnEventTypesSchema;
