import { z } from 'zod';
import { WorkflowTriggerEventsSchema } from '../inputTypeSchemas/WorkflowTriggerEventsSchema'
import { TimeUnitSchema } from '../inputTypeSchemas/TimeUnitSchema'
import { WorkflowTypeSchema } from '../inputTypeSchemas/WorkflowTypeSchema'

/////////////////////////////////////////
// WORKFLOW SCHEMA
/////////////////////////////////////////

export const WorkflowSchema = z.object({
  trigger: WorkflowTriggerEventsSchema,
  timeUnit: TimeUnitSchema.nullable(),
  type: WorkflowTypeSchema,
  id: z.number().int(),
  name: z.string(),
  userId: z.number().int().nullable(),
  teamId: z.number().int().nullable(),
  time: z.number().int().nullable(),
  isActiveOnAll: z.boolean(),
  position: z.number().int(),
})

export type Workflow = z.infer<typeof WorkflowSchema>

export default WorkflowSchema;
