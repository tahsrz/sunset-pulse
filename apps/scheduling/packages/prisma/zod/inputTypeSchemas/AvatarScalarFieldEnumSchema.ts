import { z } from 'zod';

export const AvatarScalarFieldEnumSchema = z.enum(['teamId','userId','data','objectKey','isBanner']);

export default AvatarScalarFieldEnumSchema;
