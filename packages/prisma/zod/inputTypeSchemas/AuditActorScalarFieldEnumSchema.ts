import { z } from 'zod';

export const AuditActorScalarFieldEnumSchema = z.enum(['id','type','userUuid','attendeeId','credentialId','email','phone','name','createdAt']);

export default AuditActorScalarFieldEnumSchema;
