import { z } from 'zod';

export const DelegationCredentialScalarFieldEnumSchema = z.enum(['id','workspacePlatformId','serviceAccountKey','enabled','lastEnabledAt','lastDisabledAt','organizationId','domain','createdAt','updatedAt']);

export default DelegationCredentialScalarFieldEnumSchema;
