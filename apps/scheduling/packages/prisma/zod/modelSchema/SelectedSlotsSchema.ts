import { z } from 'zod';

/////////////////////////////////////////
// SELECTED SLOTS SCHEMA
/////////////////////////////////////////

export const SelectedSlotsSchema = z.object({
  id: z.number().int(),
  eventTypeId: z.number().int(),
  userId: z.number().int(),
  slotUtcStartDate: z.coerce.date(),
  slotUtcEndDate: z.coerce.date(),
  uid: z.string(),
  releaseAt: z.coerce.date(),
  isSeat: z.boolean(),
})

export type SelectedSlots = z.infer<typeof SelectedSlotsSchema>

export default SelectedSlotsSchema;
