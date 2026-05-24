import { z } from 'zod';

export const PlatformBillingScalarFieldEnumSchema = z.enum(['id','customerId','subscriptionId','priceId','plan','billingCycleStart','billingCycleEnd','overdue','managerBillingId']);

export default PlatformBillingScalarFieldEnumSchema;
