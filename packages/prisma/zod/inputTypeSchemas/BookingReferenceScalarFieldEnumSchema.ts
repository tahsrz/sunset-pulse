import { z } from 'zod';

export const BookingReferenceScalarFieldEnumSchema = z.enum(['id','type','uid','meetingId','thirdPartyRecurringEventId','meetingPassword','meetingUrl','bookingId','externalCalendarId','deleted','credentialId','delegationCredentialId']);

export default BookingReferenceScalarFieldEnumSchema;
