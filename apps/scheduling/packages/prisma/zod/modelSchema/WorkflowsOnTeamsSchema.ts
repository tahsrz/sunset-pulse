import { z } from 'zod';

/////////////////////////////////////////
// WORKFLOWS ON TEAMS SCHEMA
/////////////////////////////////////////

export const WorkflowsOnTeamsSchema = z.object({
  id: z.number().int(),
  workflowId: z.number().int(),
  teamId: z.number().int(),
})

export type WorkflowsOnTeams = z.infer<typeof WorkflowsOnTeamsSchema>

export default WorkflowsOnTeamsSchema;
