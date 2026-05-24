import { z } from 'zod';

export const AccessTokenScalarFieldEnumSchema = z.enum(['id','secret','createdAt','expiresAt','platformOAuthClientId','userId']);

export default AccessTokenScalarFieldEnumSchema;
