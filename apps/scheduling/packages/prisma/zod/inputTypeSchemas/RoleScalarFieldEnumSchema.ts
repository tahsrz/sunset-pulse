import { z } from 'zod';

export const RoleScalarFieldEnumSchema = z.enum(['id','name','color','description','teamId','createdAt','updatedAt','type']);

export default RoleScalarFieldEnumSchema;
