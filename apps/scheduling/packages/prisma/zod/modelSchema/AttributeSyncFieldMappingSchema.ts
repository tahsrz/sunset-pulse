import { z } from 'zod';

/////////////////////////////////////////
// ATTRIBUTE SYNC FIELD MAPPING SCHEMA
/////////////////////////////////////////

export const AttributeSyncFieldMappingSchema = z.object({
  id: z.string().uuid(),
  integrationFieldName: z.string(),
  attributeId: z.string(),
  enabled: z.boolean(),
  integrationAttributeSyncId: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type AttributeSyncFieldMapping = z.infer<typeof AttributeSyncFieldMappingSchema>

export default AttributeSyncFieldMappingSchema;
