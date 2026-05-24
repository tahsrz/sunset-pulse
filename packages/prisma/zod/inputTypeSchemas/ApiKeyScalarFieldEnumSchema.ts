import { z } from 'zod';

export const ApiKeyScalarFieldEnumSchema = z.enum(['id','userId','teamId','note','createdAt','expiresAt','lastUsedAt','hashedKey','appId']);

export default ApiKeyScalarFieldEnumSchema;
