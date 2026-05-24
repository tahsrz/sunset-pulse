import { z } from 'zod';
import { ReminderTypeSchema } from '../inputTypeSchemas/ReminderTypeSchema'

/////////////////////////////////////////
// REMINDER MAIL SCHEMA
/////////////////////////////////////////

export const ReminderMailSchema = z.object({
  reminderType: ReminderTypeSchema,
  id: z.number().int(),
  referenceId: z.number().int(),
  elapsedMinutes: z.number().int(),
  createdAt: z.coerce.date(),
})

export type ReminderMail = z.infer<typeof ReminderMailSchema>

export default ReminderMailSchema;
