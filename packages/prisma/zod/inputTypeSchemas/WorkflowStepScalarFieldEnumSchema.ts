import { z } from 'zod';

export const WorkflowStepScalarFieldEnumSchema = z.enum(['id','stepNumber','action','workflowId','sendTo','reminderBody','emailSubject','template','numberRequired','sender','numberVerificationPending','includeCalendarEvent','autoTranslateEnabled','sourceLocale','verifiedAt','agentId','inboundAgentId']);

export default WorkflowStepScalarFieldEnumSchema;
