import { z } from 'zod';

export const EventTypeCustomInputTypeSchema = z.enum(['TEXT','TEXTLONG','NUMBER','BOOL','RADIO','PHONE']);

export type EventTypeCustomInputTypeType = `${z.infer<typeof EventTypeCustomInputTypeSchema>}`

export default EventTypeCustomInputTypeSchema;
