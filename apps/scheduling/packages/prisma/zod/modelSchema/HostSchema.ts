import { z } from 'zod';

/////////////////////////////////////////
// HOST SCHEMA
/////////////////////////////////////////

export const HostSchema = z.object({
  userId: z.number().int(),
  eventTypeId: z.number().int(),
  isFixed: z.boolean(),
  priority: z.number().int().nullable(),
  weight: z.number().int().nullable(),
  weightAdjustment: z.number().int().nullable(),
  scheduleId: z.number().int().nullable(),
  createdAt: z.coerce.date(),
  groupId: z.string().nullable(),
  memberId: z.number().int().nullable(),
})

export type Host = z.infer<typeof HostSchema>

export default HostSchema;
