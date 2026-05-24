import { z } from 'zod';

export const UserPasswordScalarFieldEnumSchema = z.enum(['hash','userId']);

export default UserPasswordScalarFieldEnumSchema;
