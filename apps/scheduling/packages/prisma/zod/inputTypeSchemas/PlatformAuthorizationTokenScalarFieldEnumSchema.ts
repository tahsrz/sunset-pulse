import { z } from 'zod';

export const PlatformAuthorizationTokenScalarFieldEnumSchema = z.enum(['id','platformOAuthClientId','userId','createdAt']);

export default PlatformAuthorizationTokenScalarFieldEnumSchema;
