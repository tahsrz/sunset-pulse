import { z } from 'zod';

/////////////////////////////////////////
// INTERNAL NOTE PRESET SCHEMA
/////////////////////////////////////////

export const InternalNotePresetSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  cancellationReason: z.string().nullable(),
  teamId: z.number().int(),
  createdAt: z.coerce.date(),
})

export type InternalNotePreset = z.infer<typeof InternalNotePresetSchema>

export default InternalNotePresetSchema;
