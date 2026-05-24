import { z } from 'zod';

export const ReminderTypeSchema = z.enum(['PENDING_BOOKING_CONFIRMATION']);

export type ReminderTypeType = `${z.infer<typeof ReminderTypeSchema>}`

export default ReminderTypeSchema;
