import { z } from 'zod';

/////////////////////////////////////////
// D SYNC TEAM GROUP MAPPING SCHEMA
/////////////////////////////////////////

export const DSyncTeamGroupMappingSchema = z.object({
  id: z.number().int(),
  organizationId: z.number().int(),
  teamId: z.number().int(),
  directoryId: z.string(),
  groupName: z.string(),
})

export type DSyncTeamGroupMapping = z.infer<typeof DSyncTeamGroupMappingSchema>

export default DSyncTeamGroupMappingSchema;
