import { z } from 'zod';
import { emailSchema } from '../../zod-utils'

/////////////////////////////////////////
// DESTINATION CALENDAR SCHEMA
/////////////////////////////////////////

export const DestinationCalendarSchema = z.object({
  id: z.number().int(),
  integration: z.string(),
  externalId: z.string(),
  primaryEmail: emailSchema.nullable(),
  userId: z.number().int().nullable(),
  eventTypeId: z.number().int().nullable(),
  credentialId: z.number().int().nullable(),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
  delegationCredentialId: z.string().nullable(),
  customCalendarReminder: z.number().int().nullable(),
})

export type DestinationCalendar = z.infer<typeof DestinationCalendarSchema>

export default DestinationCalendarSchema;
