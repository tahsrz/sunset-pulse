import { z } from 'zod';

export const ResetPasswordRequestScalarFieldEnumSchema = z.enum(['id','createdAt','updatedAt','email','expires']);

export default ResetPasswordRequestScalarFieldEnumSchema;
