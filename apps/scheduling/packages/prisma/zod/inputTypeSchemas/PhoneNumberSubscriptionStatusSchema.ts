import { z } from 'zod';

export const PhoneNumberSubscriptionStatusSchema = z.enum(['ACTIVE','PAST_DUE','CANCELLED','INCOMPLETE','INCOMPLETE_EXPIRED','TRIALING','UNPAID']);

export type PhoneNumberSubscriptionStatusType = `${z.infer<typeof PhoneNumberSubscriptionStatusSchema>}`

export default PhoneNumberSubscriptionStatusSchema;
