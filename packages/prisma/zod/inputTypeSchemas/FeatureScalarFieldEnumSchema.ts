import { z } from 'zod';

export const FeatureScalarFieldEnumSchema = z.enum(['slug','enabled','description','type','stale','lastUsedAt','createdAt','updatedAt','updatedBy']);

export default FeatureScalarFieldEnumSchema;
