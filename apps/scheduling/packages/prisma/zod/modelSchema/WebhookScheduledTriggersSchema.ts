import { z } from 'zod';

/////////////////////////////////////////
// WEBHOOK SCHEDULED TRIGGERS SCHEMA
/////////////////////////////////////////

export const WebhookScheduledTriggersSchema = z.object({
  id: z.number().int(),
  jobName: z.string().nullable(),
  subscriberUrl: z.string(),
  payload: z.string(),
  startAfter: z.coerce.date(),
  retryCount: z.number().int(),
  createdAt: z.coerce.date().nullable(),
  appId: z.string().nullable(),
  webhookId: z.string().nullable(),
  bookingId: z.number().int().nullable(),
})

export type WebhookScheduledTriggers = z.infer<typeof WebhookScheduledTriggersSchema>

export default WebhookScheduledTriggersSchema;
