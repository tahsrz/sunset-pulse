import { z } from 'zod';
import { AuditActorTypeSchema } from '../inputTypeSchemas/AuditActorTypeSchema'

/////////////////////////////////////////
// AUDIT ACTOR SCHEMA
/////////////////////////////////////////

export const AuditActorSchema = z.object({
  type: AuditActorTypeSchema,
  id: z.string().uuid(),
  userUuid: z.string().nullable(),
  attendeeId: z.number().int().nullable(),
  credentialId: z.number().int().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  name: z.string().nullable(),
  createdAt: z.coerce.date(),
})

export type AuditActor = z.infer<typeof AuditActorSchema>

export default AuditActorSchema;
