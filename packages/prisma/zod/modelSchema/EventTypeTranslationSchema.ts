import { z } from 'zod';
import { EventTypeAutoTranslatedFieldSchema } from '../inputTypeSchemas/EventTypeAutoTranslatedFieldSchema'

/////////////////////////////////////////
// EVENT TYPE TRANSLATION SCHEMA
/////////////////////////////////////////

export const EventTypeTranslationSchema = z.object({
  field: EventTypeAutoTranslatedFieldSchema,
  uid: z.string().cuid(),
  eventTypeId: z.number().int(),
  sourceLocale: z.string(),
  targetLocale: z.string(),
  translatedText: z.string(),
  createdAt: z.coerce.date(),
  createdBy: z.number().int(),
  updatedAt: z.coerce.date(),
  updatedBy: z.number().int().nullable(),
})

export type EventTypeTranslation = z.infer<typeof EventTypeTranslationSchema>

export default EventTypeTranslationSchema;
