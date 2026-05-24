import { z } from 'zod';

export const InternalNotePresetScalarFieldEnumSchema = z.enum(['id','name','cancellationReason','teamId','createdAt']);

export default InternalNotePresetScalarFieldEnumSchema;
