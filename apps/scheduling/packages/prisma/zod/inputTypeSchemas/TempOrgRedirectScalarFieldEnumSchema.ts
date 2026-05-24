import { z } from 'zod';

export const TempOrgRedirectScalarFieldEnumSchema = z.enum(['id','from','fromOrgId','type','toUrl','enabled','createdAt','updatedAt']);

export default TempOrgRedirectScalarFieldEnumSchema;
