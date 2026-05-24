import { z } from 'zod';

/////////////////////////////////////////
// CAL VIDEO SETTINGS SCHEMA
/////////////////////////////////////////

export const CalVideoSettingsSchema = z.object({
  eventTypeId: z.number().int(),
  disableRecordingForOrganizer: z.boolean(),
  disableRecordingForGuests: z.boolean(),
  enableAutomaticTranscription: z.boolean(),
  enableAutomaticRecordingForOrganizer: z.boolean(),
  redirectUrlOnExit: z.string().nullable(),
  disableTranscriptionForGuests: z.boolean(),
  disableTranscriptionForOrganizer: z.boolean(),
  requireEmailForGuests: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type CalVideoSettings = z.infer<typeof CalVideoSettingsSchema>

export default CalVideoSettingsSchema;
