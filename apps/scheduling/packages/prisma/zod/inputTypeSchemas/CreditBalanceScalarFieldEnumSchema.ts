import { z } from 'zod';

export const CreditBalanceScalarFieldEnumSchema = z.enum(['id','teamId','userId','additionalCredits','limitReachedAt','warningSentAt']);

export default CreditBalanceScalarFieldEnumSchema;
