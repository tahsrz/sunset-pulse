import { z } from 'zod';
import { WorkflowStepAutoTranslatedFieldSchema } from '../inputTypeSchemas/WorkflowStepAutoTranslatedFieldSchema'

/////////////////////////////////////////
// WORKFLOW STEP TRANSLATION SCHEMA
/////////////////////////////////////////

export const WorkflowStepTranslationSchema = z.object({
  field: WorkflowStepAutoTranslatedFieldSchema,
  uid: z.string().uuid(),
  workflowStepId: z.number().int(),
  sourceLocale: z.string(),
  targetLocale: z.string(),
  translatedText: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type WorkflowStepTranslation = z.infer<typeof WorkflowStepTranslationSchema>

export default WorkflowStepTranslationSchema;
