import { z } from 'zod';

/////////////////////////////////////////
// SMS SHIFT OFFER SCHEMA
/////////////////////////////////////////

export const SmsShiftOfferSchema = z.object({
  id: z.string().uuid(),
  bookingId: z.number().int(),
  userId: z.number().int(),
  phoneNumber: z.string(),
  status: z.string(),
  createdAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
})

export type SmsShiftOffer = z.infer<typeof SmsShiftOfferSchema>

export default SmsShiftOfferSchema;
