import { z } from 'zod';

/////////////////////////////////////////
// TEAM FEATURES SCHEMA
/////////////////////////////////////////

export const TeamFeaturesSchema = z.object({
  teamId: z.number().int(),
  featureId: z.string(),
  enabled: z.boolean(),
  assignedAt: z.coerce.date(),
  assignedBy: z.string(),
  updatedAt: z.coerce.date(),
})

export type TeamFeatures = z.infer<typeof TeamFeaturesSchema>

export default TeamFeaturesSchema;
