import { z } from 'zod';

export const AvailabilityScalarFieldEnumSchema = z.enum(['id','userId','eventTypeId','days','startTime','endTime','date','scheduleId']);

export default AvailabilityScalarFieldEnumSchema;
