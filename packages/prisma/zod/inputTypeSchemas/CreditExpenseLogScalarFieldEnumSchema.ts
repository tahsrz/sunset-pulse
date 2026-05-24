import { z } from 'zod';

export const CreditExpenseLogScalarFieldEnumSchema = z.enum(['id','creditBalanceId','bookingUid','credits','creditType','date','smsSid','smsSegments','phoneNumber','email','callDuration','creditFor','externalRef']);

export default CreditExpenseLogScalarFieldEnumSchema;
