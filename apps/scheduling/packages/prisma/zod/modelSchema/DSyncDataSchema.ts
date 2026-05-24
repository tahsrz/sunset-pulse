import { z } from 'zod';

/////////////////////////////////////////
// D SYNC DATA SCHEMA
/////////////////////////////////////////

export const DSyncDataSchema = z.object({
  id: z.number().int(),
  directoryId: z.string(),
  tenant: z.string(),
  organizationId: z.number().int().nullable(),
})

export type DSyncData = z.infer<typeof DSyncDataSchema>

export default DSyncDataSchema;
