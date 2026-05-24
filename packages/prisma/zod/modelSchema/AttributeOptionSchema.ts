import { z } from 'zod';

/////////////////////////////////////////
// ATTRIBUTE OPTION SCHEMA
/////////////////////////////////////////

export const AttributeOptionSchema = z.object({
  id: z.string().uuid(),
  attributeId: z.string(),
  value: z.string(),
  slug: z.string(),
  isGroup: z.boolean(),
  contains: z.string().array(),
})

export type AttributeOption = z.infer<typeof AttributeOptionSchema>

export default AttributeOptionSchema;
