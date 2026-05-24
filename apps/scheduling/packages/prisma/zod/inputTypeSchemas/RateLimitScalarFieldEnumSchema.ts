import { z } from 'zod';

export const RateLimitScalarFieldEnumSchema = z.enum(['id','name','apiKeyId','ttl','limit','blockDuration','createdAt','updatedAt']);

export default RateLimitScalarFieldEnumSchema;
