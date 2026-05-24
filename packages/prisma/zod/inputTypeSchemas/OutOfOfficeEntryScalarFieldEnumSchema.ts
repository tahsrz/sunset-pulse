import { z } from 'zod';

export const OutOfOfficeEntryScalarFieldEnumSchema = z.enum(['id','uuid','start','end','notes','showNotePublicly','userId','toUserId','reasonId','createdAt','updatedAt']);

export default OutOfOfficeEntryScalarFieldEnumSchema;
