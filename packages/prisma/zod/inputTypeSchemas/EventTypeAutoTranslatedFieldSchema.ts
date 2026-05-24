import { z } from 'zod';

export const EventTypeAutoTranslatedFieldSchema = z.enum(['DESCRIPTION','TITLE']);

export type EventTypeAutoTranslatedFieldType = `${z.infer<typeof EventTypeAutoTranslatedFieldSchema>}`

export default EventTypeAutoTranslatedFieldSchema;
