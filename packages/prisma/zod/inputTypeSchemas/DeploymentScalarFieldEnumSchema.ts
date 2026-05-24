import { z } from 'zod';

export const DeploymentScalarFieldEnumSchema = z.enum(['id','logo','theme','licenseKey','signatureTokenEncrypted','agreedLicenseAt']);

export default DeploymentScalarFieldEnumSchema;
