import { z } from 'zod';

/////////////////////////////////////////
// INTEGRATION ATTRIBUTE SYNC SCHEMA
/////////////////////////////////////////

export const IntegrationAttributeSyncSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.number().int(),
  name: z.string(),
  integration: z.string(),
  credentialId: z.number().int().nullable(),
  enabled: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type IntegrationAttributeSync = z.infer<typeof IntegrationAttributeSyncSchema>

export default IntegrationAttributeSyncSchema;
