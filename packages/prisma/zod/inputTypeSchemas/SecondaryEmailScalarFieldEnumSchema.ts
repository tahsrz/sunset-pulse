import { z } from 'zod';

export const SecondaryEmailScalarFieldEnumSchema = z.enum(['id','userId','email','emailVerified']);

export default SecondaryEmailScalarFieldEnumSchema;
