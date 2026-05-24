import { z } from 'zod';

export const SystemReportStatusSchema = z.enum(['PENDING','BLOCKED','DISMISSED']);

export type SystemReportStatusType = `${z.infer<typeof SystemReportStatusSchema>}`

export default SystemReportStatusSchema;
