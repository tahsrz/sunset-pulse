import { z } from 'zod';

export const UserFeaturesScalarFieldEnumSchema = z.enum(['userId','featureId','enabled','assignedAt','assignedBy','updatedAt']);

export default UserFeaturesScalarFieldEnumSchema;
