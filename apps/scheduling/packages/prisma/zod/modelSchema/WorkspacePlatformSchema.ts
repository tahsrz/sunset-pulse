import { z } from 'zod';
import { JsonValueSchema } from '../inputTypeSchemas/JsonValueSchema'
import { serviceAccountKeySchema } from '../../zod-utils'

/////////////////////////////////////////
// WORKSPACE PLATFORM SCHEMA
/////////////////////////////////////////

export const WorkspacePlatformSchema = z.object({
  id: z.number().int(),
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  defaultServiceAccountKey: serviceAccountKeySchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  enabled: z.boolean(),
})

export type WorkspacePlatform = z.infer<typeof WorkspacePlatformSchema>

export default WorkspacePlatformSchema;
