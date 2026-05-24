import { z } from 'zod';

export const TrackingScalarFieldEnumSchema = z.enum(['id','bookingId','utm_source','utm_medium','utm_campaign','utm_term','utm_content']);

export default TrackingScalarFieldEnumSchema;
