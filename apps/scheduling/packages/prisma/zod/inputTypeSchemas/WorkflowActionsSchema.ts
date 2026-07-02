import { z } from 'zod';

export const WorkflowActionsSchema = z.enum(['EMAIL_HOST','EMAIL_ATTENDEE','SMS_ATTENDEE','SMS_NUMBER','EMAIL_ADDRESS','WHATSAPP_ATTENDEE','WHATSAPP_NUMBER']);

export type WorkflowActionsType = `${z.infer<typeof WorkflowActionsSchema>}`

export default WorkflowActionsSchema;
