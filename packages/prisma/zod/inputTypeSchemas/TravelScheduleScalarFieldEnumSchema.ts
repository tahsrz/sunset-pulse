import { z } from 'zod';

export const TravelScheduleScalarFieldEnumSchema = z.enum(['id','userId','timeZone','startDate','endDate','prevTimeZone']);

export default TravelScheduleScalarFieldEnumSchema;
