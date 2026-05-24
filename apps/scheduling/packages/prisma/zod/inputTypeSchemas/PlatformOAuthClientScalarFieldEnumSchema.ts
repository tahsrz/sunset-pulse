import { z } from 'zod';

export const PlatformOAuthClientScalarFieldEnumSchema = z.enum(['id','name','secret','permissions','logo','redirectUris','organizationId','bookingRedirectUri','bookingCancelRedirectUri','bookingRescheduleRedirectUri','areEmailsEnabled','areDefaultEventTypesEnabled','areCalendarEventsEnabled','createdAt']);

export default PlatformOAuthClientScalarFieldEnumSchema;
