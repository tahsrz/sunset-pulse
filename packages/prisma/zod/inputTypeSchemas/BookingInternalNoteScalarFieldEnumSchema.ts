import { z } from 'zod';

export const BookingInternalNoteScalarFieldEnumSchema = z.enum(['id','notePresetId','text','bookingId','createdById','createdAt']);

export default BookingInternalNoteScalarFieldEnumSchema;
