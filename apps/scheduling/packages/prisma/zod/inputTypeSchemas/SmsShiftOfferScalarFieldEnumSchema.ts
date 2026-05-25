import { z } from 'zod';

export const SmsShiftOfferScalarFieldEnumSchema = z.enum(['id','bookingId','userId','phoneNumber','status','createdAt','expiresAt']);

export default SmsShiftOfferScalarFieldEnumSchema;
