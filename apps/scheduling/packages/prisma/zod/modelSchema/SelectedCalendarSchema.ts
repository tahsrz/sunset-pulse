import { z } from 'zod';

/////////////////////////////////////////
// SELECTED CALENDAR SCHEMA
/////////////////////////////////////////

export const SelectedCalendarSchema = z.object({
  id: z.string().uuid(),
  userId: z.number().int(),
  integration: z.string(),
  externalId: z.string(),
  credentialId: z.number().int().nullable(),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
  googleChannelId: z.string().nullable(),
  googleChannelKind: z.string().nullable(),
  googleChannelResourceId: z.string().nullable(),
  googleChannelResourceUri: z.string().nullable(),
  googleChannelExpiration: z.string().nullable(),
  channelId: z.string().nullable(),
  channelKind: z.string().nullable(),
  channelResourceId: z.string().nullable(),
  channelResourceUri: z.string().nullable(),
  channelExpiration: z.coerce.date().nullable(),
  syncSubscribedAt: z.coerce.date().nullable(),
  syncSubscribedErrorAt: z.coerce.date().nullable(),
  syncSubscribedErrorCount: z.number().int(),
  syncToken: z.string().nullable(),
  syncedAt: z.coerce.date().nullable(),
  syncErrorAt: z.coerce.date().nullable(),
  syncErrorCount: z.number().int().nullable(),
  delegationCredentialId: z.string().nullable(),
  error: z.string().nullable(),
  lastErrorAt: z.coerce.date().nullable(),
  watchAttempts: z.number().int(),
  unwatchAttempts: z.number().int(),
  maxAttempts: z.number().int(),
  eventTypeId: z.number().int().nullable(),
})

export type SelectedCalendar = z.infer<typeof SelectedCalendarSchema>

export default SelectedCalendarSchema;
