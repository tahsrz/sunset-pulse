import { z } from 'zod';

export const TaskScalarFieldEnumSchema = z.enum(['id','createdAt','updatedAt','scheduledAt','succeededAt','type','payload','attempts','maxAttempts','lastError','lastFailedAttemptAt','referenceUid']);

export default TaskScalarFieldEnumSchema;
