import { z } from 'zod';

/////////////////////////////////////////
// NOTIFICATIONS SUBSCRIPTIONS SCHEMA
/////////////////////////////////////////

export const NotificationsSubscriptionsSchema = z.object({
  id: z.number().int(),
  userId: z.number().int(),
  subscription: z.string(),
})

export type NotificationsSubscriptions = z.infer<typeof NotificationsSubscriptionsSchema>

export default NotificationsSubscriptionsSchema;
