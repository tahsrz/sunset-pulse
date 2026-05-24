import { z } from 'zod';

/////////////////////////////////////////
// HOST GROUP SCHEMA
/////////////////////////////////////////

export const HostGroupSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  eventTypeId: z.number().int().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type HostGroup = z.infer<typeof HostGroupSchema>

export default HostGroupSchema;
