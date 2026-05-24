import { z } from 'zod';

export const CalendarCacheScalarFieldEnumSchema = z.enum(['id','key','value','expiresAt','updatedAt','credentialId','userId']);

export default CalendarCacheScalarFieldEnumSchema;
