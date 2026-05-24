import { z } from 'zod';

export const IntegrationAttributeSyncScalarFieldEnumSchema = z.enum(['id','organizationId','name','integration','credentialId','enabled','createdAt','updatedAt']);

export default IntegrationAttributeSyncScalarFieldEnumSchema;
