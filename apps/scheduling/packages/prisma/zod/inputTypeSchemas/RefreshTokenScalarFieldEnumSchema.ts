import { z } from 'zod';

export const RefreshTokenScalarFieldEnumSchema = z.enum(['id','secret','createdAt','expiresAt','platformOAuthClientId','userId']);

export default RefreshTokenScalarFieldEnumSchema;
