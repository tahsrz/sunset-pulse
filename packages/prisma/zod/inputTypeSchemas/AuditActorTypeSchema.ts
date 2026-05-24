import { z } from 'zod';

export const AuditActorTypeSchema = z.enum(['USER','GUEST','ATTENDEE','SYSTEM','APP']);

export type AuditActorTypeType = `${z.infer<typeof AuditActorTypeSchema>}`

export default AuditActorTypeSchema;
