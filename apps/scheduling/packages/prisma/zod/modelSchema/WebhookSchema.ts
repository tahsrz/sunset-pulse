import { z } from 'zod';
import { WebhookTriggerEventsSchema } from '../inputTypeSchemas/WebhookTriggerEventsSchema'
import { TimeUnitSchema } from '../inputTypeSchemas/TimeUnitSchema'

/////////////////////////////////////////
// WEBHOOK SCHEMA
/////////////////////////////////////////

export const WebhookSchema = z.object({
  eventTriggers: WebhookTriggerEventsSchema.array(),
  timeUnit: TimeUnitSchema.nullable(),
  id: z.string(),
  userId: z.number().int().nullable(),
  teamId: z.number().int().nullable(),
  eventTypeId: z.number().int().nullable(),
  platformOAuthClientId: z.string().nullable(),
  subscriberUrl: z.string().url(),
  payloadTemplate: z.string().nullable(),
  createdAt: z.coerce.date(),
  active: z.boolean(),
  appId: z.string().nullable(),
  secret: z.string().nullable(),
  platform: z.boolean(),
  time: z.number().int().nullable(),
  version: z.string(),
})

export type Webhook = z.infer<typeof WebhookSchema>

export default WebhookSchema;
