import { z } from 'zod';
import { JsonValueSchema } from '../inputTypeSchemas/JsonValueSchema'
import { AppCategoriesSchema } from '../inputTypeSchemas/AppCategoriesSchema'

/////////////////////////////////////////
// APP SCHEMA
/////////////////////////////////////////

export const AppSchema = z.object({
  categories: AppCategoriesSchema.array(),
  slug: z.string(),
  dirName: z.string(),
  keys: JsonValueSchema.nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  enabled: z.boolean(),
})

export type App = z.infer<typeof AppSchema>

export default AppSchema;
