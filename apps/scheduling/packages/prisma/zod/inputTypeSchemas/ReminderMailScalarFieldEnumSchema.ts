import { z } from 'zod';

export const ReminderMailScalarFieldEnumSchema = z.enum(['id','referenceId','reminderType','elapsedMinutes','createdAt']);

export default ReminderMailScalarFieldEnumSchema;
