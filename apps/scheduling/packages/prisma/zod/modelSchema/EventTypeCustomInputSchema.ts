import { z } from 'zod';
import { JsonValueSchema } from '../inputTypeSchemas/JsonValueSchema'
import { EventTypeCustomInputTypeSchema } from '../inputTypeSchemas/EventTypeCustomInputTypeSchema'
import { customInputOptionSchema } from '../../zod-utils'

/////////////////////////////////////////
// EVENT TYPE CUSTOM INPUT SCHEMA
/////////////////////////////////////////

export const EventTypeCustomInputSchema = z.object({
  type: EventTypeCustomInputTypeSchema,
  id: z.number().int(),
  eventTypeId: z.number().int(),
  label: z.string(),
  options: customInputOptionSchema.nullable(),
  required: z.boolean(),
  placeholder: z.string(),
})

export type EventTypeCustomInput = z.infer<typeof EventTypeCustomInputSchema>

export default EventTypeCustomInputSchema;
