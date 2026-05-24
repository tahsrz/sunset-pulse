import { z } from 'zod';

export const ProfileScalarFieldEnumSchema = z.enum(['id','uid','userId','organizationId','username','createdAt','updatedAt']);

export default ProfileScalarFieldEnumSchema;
