import { z } from 'zod';
import { OAuthClientTypeSchema } from '../inputTypeSchemas/OAuthClientTypeSchema'
import { OAuthClientStatusSchema } from '../inputTypeSchemas/OAuthClientStatusSchema'

/////////////////////////////////////////
// O AUTH CLIENT SCHEMA
/////////////////////////////////////////

export const OAuthClientSchema = z.object({
  clientType: OAuthClientTypeSchema,
  status: OAuthClientStatusSchema,
  clientId: z.string(),
  redirectUri: z.string(),
  clientSecret: z.string().nullable(),
  name: z.string(),
  purpose: z.string().nullable(),
  logo: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  isTrusted: z.boolean(),
  userId: z.number().int().nullable(),
  createdAt: z.coerce.date(),
})

export type OAuthClient = z.infer<typeof OAuthClientSchema>

export default OAuthClientSchema;
