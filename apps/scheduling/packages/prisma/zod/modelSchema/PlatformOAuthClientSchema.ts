import { z } from 'zod';

/////////////////////////////////////////
// PLATFORM O AUTH CLIENT SCHEMA
/////////////////////////////////////////

export const PlatformOAuthClientSchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  secret: z.string(),
  permissions: z.number().int(),
  logo: z.string().nullable(),
  redirectUris: z.string().array(),
  organizationId: z.number().int(),
  bookingRedirectUri: z.string().nullable(),
  bookingCancelRedirectUri: z.string().nullable(),
  bookingRescheduleRedirectUri: z.string().nullable(),
  areEmailsEnabled: z.boolean(),
  areDefaultEventTypesEnabled: z.boolean(),
  areCalendarEventsEnabled: z.boolean(),
  createdAt: z.coerce.date(),
})

export type PlatformOAuthClient = z.infer<typeof PlatformOAuthClientSchema>

export default PlatformOAuthClientSchema;
