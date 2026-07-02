import { z } from 'zod';

export const WorkflowContactTypeSchema = z.enum(['PHONE','EMAIL']);

export type WorkflowContactTypeType = `${z.infer<typeof WorkflowContactTypeSchema>}`

export default WorkflowContactTypeSchema;
