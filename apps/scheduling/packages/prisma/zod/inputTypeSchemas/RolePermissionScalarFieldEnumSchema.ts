import { z } from 'zod';

export const RolePermissionScalarFieldEnumSchema = z.enum(['id','roleId','resource','action','createdAt']);

export default RolePermissionScalarFieldEnumSchema;
