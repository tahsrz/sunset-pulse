import { z } from 'zod';
import { JsonValueSchema } from '../inputTypeSchemas/JsonValueSchema'
import { DeploymentTheme } from '../../zod-utils'

/////////////////////////////////////////
// DEPLOYMENT SCHEMA
/////////////////////////////////////////

export const DeploymentSchema = z.object({
  /**
   * This is a single row table, so we use a fixed id
   */
  id: z.number().int(),
  logo: z.string().nullable(),
  theme: DeploymentTheme.nullable(),
  licenseKey: z.string().nullable(),
  signatureTokenEncrypted: z.string().nullable(),
  agreedLicenseAt: z.coerce.date().nullable(),
})

export type Deployment = z.infer<typeof DeploymentSchema>

export default DeploymentSchema;
