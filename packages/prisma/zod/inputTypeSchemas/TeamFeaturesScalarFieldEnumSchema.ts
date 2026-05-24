import { z } from 'zod';

export const TeamFeaturesScalarFieldEnumSchema = z.enum(['teamId','featureId','enabled','assignedAt','assignedBy','updatedAt']);

export default TeamFeaturesScalarFieldEnumSchema;
