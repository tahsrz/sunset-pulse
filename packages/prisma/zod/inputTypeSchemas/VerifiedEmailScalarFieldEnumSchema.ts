import { z } from 'zod';

export const VerifiedEmailScalarFieldEnumSchema = z.enum(['id','userId','teamId','email']);

export default VerifiedEmailScalarFieldEnumSchema;
