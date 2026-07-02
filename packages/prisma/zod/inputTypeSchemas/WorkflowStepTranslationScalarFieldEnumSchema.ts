import { z } from 'zod';

export const WorkflowStepTranslationScalarFieldEnumSchema = z.enum(['uid','workflowStepId','field','sourceLocale','targetLocale','translatedText','createdAt','updatedAt']);

export default WorkflowStepTranslationScalarFieldEnumSchema;
