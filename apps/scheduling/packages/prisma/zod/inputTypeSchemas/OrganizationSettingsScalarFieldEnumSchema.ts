import { z } from 'zod';

export const OrganizationSettingsScalarFieldEnumSchema = z.enum(['id','organizationId','isOrganizationConfigured','isOrganizationVerified','orgAutoAcceptEmail','lockEventTypeCreationForUsers','adminGetsNoSlotsNotification','isAdminReviewed','isAdminAPIEnabled','allowSEOIndexing','orgProfileRedirectsToVerifiedDomain','disablePhoneOnlySMSNotifications','disableAutofillOnBookingPage','orgAutoJoinOnSignup','disableAttendeeConfirmationEmail','disableAttendeeCancellationEmail','disableAttendeeRescheduledEmail','disableAttendeeRequestEmail','disableAttendeeReassignedEmail','disableAttendeeAwaitingPaymentEmail','disableAttendeeRescheduleRequestEmail','disableAttendeeLocationChangeEmail','disableAttendeeNewEventEmail']);

export default OrganizationSettingsScalarFieldEnumSchema;
