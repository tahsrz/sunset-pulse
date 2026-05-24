import { z } from 'zod';

/////////////////////////////////////////
// USER FILTER SEGMENT PREFERENCE SCHEMA
/////////////////////////////////////////

export const UserFilterSegmentPreferenceSchema = z.object({
  id: z.number().int(),
  userId: z.number().int(),
  tableIdentifier: z.string(),
  segmentId: z.number().int().nullable(),
  systemSegmentId: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type UserFilterSegmentPreference = z.infer<typeof UserFilterSegmentPreferenceSchema>

export default UserFilterSegmentPreferenceSchema;
