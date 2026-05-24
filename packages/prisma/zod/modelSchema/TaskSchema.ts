import { z } from 'zod';

/////////////////////////////////////////
// TASK SCHEMA
/////////////////////////////////////////

export const TaskSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  scheduledAt: z.coerce.date(),
  succeededAt: z.coerce.date().nullable(),
  type: z.string(),
  payload: z.string(),
  attempts: z.number().int(),
  maxAttempts: z.number().int(),
  lastError: z.string().nullable(),
  lastFailedAttemptAt: z.coerce.date().nullable(),
  referenceUid: z.string().nullable(),
})

export type Task = z.infer<typeof TaskSchema>

export default TaskSchema;
