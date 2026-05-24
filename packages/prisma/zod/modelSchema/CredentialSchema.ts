import { z } from 'zod';
import { JsonValueSchema } from '../inputTypeSchemas/JsonValueSchema'

/////////////////////////////////////////
// CREDENTIAL SCHEMA
/////////////////////////////////////////

export const CredentialSchema = z.object({
  id: z.number().int(),
  type: z.string(),
  key: JsonValueSchema,
  encryptedKey: z.string().nullable(),
  userId: z.number().int().nullable(),
  teamId: z.number().int().nullable(),
  appId: z.string().nullable(),
  subscriptionId: z.string().nullable(),
  paymentStatus: z.string().nullable(),
  billingCycleStart: z.number().int().nullable(),
  invalid: z.boolean().nullable(),
  delegationCredentialId: z.string().nullable(),
})

export type Credential = z.infer<typeof CredentialSchema>

export default CredentialSchema;
