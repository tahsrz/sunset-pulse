import { z } from 'zod';

export const AttendeeScalarFieldEnumSchema = z.enum(['id','email','name','timeZone','phoneNumber','locale','bookingId','noShow']);

export default AttendeeScalarFieldEnumSchema;
