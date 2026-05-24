import { z } from 'zod';
import { JsonValueSchema } from '../inputTypeSchemas/JsonValueSchema'

/////////////////////////////////////////
// ATTRIBUTE SYNC RULE SCHEMA
/////////////////////////////////////////

export const AttributeSyncRuleSchema = z.object({
  id: z.string().uuid(),
  integrationAttributeSyncId: z.string(),
  rule: JsonValueSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type AttributeSyncRule = z.infer<typeof AttributeSyncRuleSchema>

export default AttributeSyncRuleSchema;
