import { z } from 'zod';

export const HolidayCacheScalarFieldEnumSchema = z.enum(['id','countryCode','calendarId','eventId','name','date','year','createdAt','updatedAt']);

export default HolidayCacheScalarFieldEnumSchema;
