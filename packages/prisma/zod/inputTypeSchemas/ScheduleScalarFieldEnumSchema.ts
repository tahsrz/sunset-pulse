import { z } from 'zod';

export const ScheduleScalarFieldEnumSchema = z.enum(['id','userId','name','timeZone']);

export default ScheduleScalarFieldEnumSchema;
