import { z } from 'zod';

export const WorkflowTemplatesSchema = z.enum(['REMINDER','CUSTOM','CANCELLED','RESCHEDULED','COMPLETED','RATING']);

export type WorkflowTemplatesType = `${z.infer<typeof WorkflowTemplatesSchema>}`

export default WorkflowTemplatesSchema;
