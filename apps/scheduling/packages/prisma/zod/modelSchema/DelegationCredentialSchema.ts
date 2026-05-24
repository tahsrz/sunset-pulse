import { z } from 'zod';
import { JsonValueSchema } from '../inputTypeSchemas/JsonValueSchema'
import { serviceAccountKeySchema } from '../../zod-utils'

/////////////////////////////////////////
// DELEGATION CREDENTIAL SCHEMA
/////////////////////////////////////////

export const DelegationCredentialSchema = z.object({
  id: z.string().uuid(),
  workspacePlatformId: z.number().int(),
  serviceAccountKey: serviceAccountKeySchema,
  enabled: z.boolean(),
  lastEnabledAt: z.coerce.date().nullable(),
  lastDisabledAt: z.coerce.date().nullable(),
  organizationId: z.number().int(),
  domain: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type DelegationCredential = z.infer<typeof DelegationCredentialSchema>

export default DelegationCredentialSchema;
