import { z } from 'zod';

export const PaymentScalarFieldEnumSchema = z.enum(['id','uid','appId','bookingId','amount','fee','currency','success','refunded','data','externalId','paymentOption']);

export default PaymentScalarFieldEnumSchema;
