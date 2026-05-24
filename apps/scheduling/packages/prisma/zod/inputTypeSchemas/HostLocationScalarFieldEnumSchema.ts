import { z } from 'zod';

export const HostLocationScalarFieldEnumSchema = z.enum(['id','userId','eventTypeId','type','credentialId','link','address','phoneNumber','createdAt','updatedAt']);

export default HostLocationScalarFieldEnumSchema;
