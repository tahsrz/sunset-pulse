import { z } from 'zod';
import { RedirectTypeSchema } from '../inputTypeSchemas/RedirectTypeSchema'

/////////////////////////////////////////
// TEMP ORG REDIRECT SCHEMA
/////////////////////////////////////////

export const TempOrgRedirectSchema = z.object({
  type: RedirectTypeSchema,
  id: z.number().int(),
  from: z.string(),
  fromOrgId: z.number().int(),
  toUrl: z.string(),
  enabled: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type TempOrgRedirect = z.infer<typeof TempOrgRedirectSchema>

export default TempOrgRedirectSchema;
