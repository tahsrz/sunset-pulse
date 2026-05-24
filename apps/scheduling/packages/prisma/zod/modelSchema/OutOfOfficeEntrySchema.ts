import { z } from 'zod';

/////////////////////////////////////////
// OUT OF OFFICE ENTRY SCHEMA
/////////////////////////////////////////

export const OutOfOfficeEntrySchema = z.object({
  id: z.number().int(),
  uuid: z.string(),
  start: z.coerce.date(),
  end: z.coerce.date(),
  notes: z.string().nullable(),
  showNotePublicly: z.boolean(),
  userId: z.number().int(),
  toUserId: z.number().int().nullable(),
  reasonId: z.number().int().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type OutOfOfficeEntry = z.infer<typeof OutOfOfficeEntrySchema>

export default OutOfOfficeEntrySchema;
