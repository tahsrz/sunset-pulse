import { z } from 'zod';

export const WorkflowStepAutoTranslatedFieldSchema = z.enum(['REMINDER_BODY','EMAIL_SUBJECT']);

export type WorkflowStepAutoTranslatedFieldType = `${z.infer<typeof WorkflowStepAutoTranslatedFieldSchema>}`

export default WorkflowStepAutoTranslatedFieldSchema;
