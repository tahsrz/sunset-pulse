import { z } from 'zod';

export const FeedbackScalarFieldEnumSchema = z.enum(['id','date','userId','rating','comment']);

export default FeedbackScalarFieldEnumSchema;
