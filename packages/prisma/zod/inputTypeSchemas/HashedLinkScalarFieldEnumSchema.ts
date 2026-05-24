import { z } from 'zod';

export const HashedLinkScalarFieldEnumSchema = z.enum(['id','link','eventTypeId','expiresAt','maxUsageCount','usageCount']);

export default HashedLinkScalarFieldEnumSchema;
