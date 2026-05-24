import { z } from 'zod';

/////////////////////////////////////////
// ORGANIZATION SETTINGS SCHEMA
/////////////////////////////////////////

export const OrganizationSettingsSchema = z.object({
  id: z.number().int(),
  organizationId: z.number().int(),
  isOrganizationConfigured: z.boolean(),
  isOrganizationVerified: z.boolean(),
  orgAutoAcceptEmail: z.string(),
  lockEventTypeCreationForUsers: z.boolean(),
  adminGetsNoSlotsNotification: z.boolean(),
  isAdminReviewed: z.boolean(),
  isAdminAPIEnabled: z.boolean(),
  allowSEOIndexing: z.boolean(),
  orgProfileRedirectsToVerifiedDomain: z.boolean(),
  disablePhoneOnlySMSNotifications: z.boolean(),
  disableAutofillOnBookingPage: z.boolean(),
  orgAutoJoinOnSignup: z.boolean(),
  disableAttendeeConfirmationEmail: z.boolean(),
  disableAttendeeCancellationEmail: z.boolean(),
  disableAttendeeRescheduledEmail: z.boolean(),
  disableAttendeeRequestEmail: z.boolean(),
  disableAttendeeReassignedEmail: z.boolean(),
  disableAttendeeAwaitingPaymentEmail: z.boolean(),
  disableAttendeeRescheduleRequestEmail: z.boolean(),
  disableAttendeeLocationChangeEmail: z.boolean(),
  disableAttendeeNewEventEmail: z.boolean(),
})

export type OrganizationSettings = z.infer<typeof OrganizationSettingsSchema>

export default OrganizationSettingsSchema;
