import { z } from 'zod';

export const MembershipScalarFieldEnumSchema = z.enum(['id','teamId','userId','accepted','role','customRoleId','createdAt','updatedAt']);

export default MembershipScalarFieldEnumSchema;
