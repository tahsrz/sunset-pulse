import { z } from 'zod';

export const VerifiedNumberScalarFieldEnumSchema = z.enum(['id','userId','teamId','phoneNumber']);

export default VerifiedNumberScalarFieldEnumSchema;
