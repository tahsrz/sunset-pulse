import { z } from 'zod';

export const BookingSeatScalarFieldEnumSchema = z.enum(['id','referenceUid','bookingId','attendeeId','data','metadata']);

export default BookingSeatScalarFieldEnumSchema;
