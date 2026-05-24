import { z } from 'zod';
import { PhoneNumberSubscriptionStatusSchema } from '../inputTypeSchemas/PhoneNumberSubscriptionStatusSchema'

/////////////////////////////////////////
// CAL AI PHONE NUMBER SCHEMA
/////////////////////////////////////////

export const CalAiPhoneNumberSchema = z.object({
  subscriptionStatus: PhoneNumberSubscriptionStatusSchema.nullable(),
  id: z.number().int(),
  userId: z.number().int().nullable(),
  teamId: z.number().int().nullable(),
  phoneNumber: z.string(),
  provider: z.string(),
  providerPhoneNumberId: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  stripeCustomerId: z.string().nullable(),
  stripeSubscriptionId: z.string().nullable(),
  inboundAgentId: z.string().nullable(),
  outboundAgentId: z.string().nullable(),
})

export type CalAiPhoneNumber = z.infer<typeof CalAiPhoneNumberSchema>

export default CalAiPhoneNumberSchema;
