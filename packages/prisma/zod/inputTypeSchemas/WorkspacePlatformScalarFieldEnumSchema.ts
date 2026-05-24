import { z } from 'zod';

export const WorkspacePlatformScalarFieldEnumSchema = z.enum(['id','slug','name','description','defaultServiceAccountKey','createdAt','updatedAt','enabled']);

export default WorkspacePlatformScalarFieldEnumSchema;
