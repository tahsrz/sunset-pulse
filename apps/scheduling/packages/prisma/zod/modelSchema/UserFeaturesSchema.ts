import { z } from 'zod';

/////////////////////////////////////////
// USER FEATURES SCHEMA
/////////////////////////////////////////

export const UserFeaturesSchema = z.object({
  userId: z.number().int(),
  featureId: z.string(),
  enabled: z.boolean(),
  assignedAt: z.coerce.date(),
  assignedBy: z.string(),
  updatedAt: z.coerce.date(),
})

export type UserFeatures = z.infer<typeof UserFeaturesSchema>

export default UserFeaturesSchema;
