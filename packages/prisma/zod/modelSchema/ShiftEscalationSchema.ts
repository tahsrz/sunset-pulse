import { z } from 'zod';

/////////////////////////////////////////
// SHIFT ESCALATION SCHEMA
/////////////////////////////////////////

export const ShiftEscalationSchema = z.object({
  id: z.string().uuid(),
  bookingId: z.number().int(),
  status: z.string(),
  currentTier: z.number().int(),
  nextEscalationTime: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type ShiftEscalation = z.infer<typeof ShiftEscalationSchema>

export default ShiftEscalationSchema;
