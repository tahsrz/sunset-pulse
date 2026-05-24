import { z } from 'zod';

export const HostGroupScalarFieldEnumSchema = z.enum(['id','name','eventTypeId','createdAt','updatedAt']);

export default HostGroupScalarFieldEnumSchema;
