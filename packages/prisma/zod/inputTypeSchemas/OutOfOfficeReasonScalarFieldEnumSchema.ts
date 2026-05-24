import { z } from 'zod';

export const OutOfOfficeReasonScalarFieldEnumSchema = z.enum(['id','emoji','reason','enabled','userId']);

export default OutOfOfficeReasonScalarFieldEnumSchema;
