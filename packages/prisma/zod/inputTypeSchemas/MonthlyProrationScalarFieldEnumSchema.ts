import { z } from 'zod';

export const MonthlyProrationScalarFieldEnumSchema = z.enum(['id','teamId','monthKey','periodStart','periodEnd','seatsAtStart','seatsAdded','seatsRemoved','netSeatIncrease','seatsAtEnd','subscriptionId','subscriptionItemId','customerId','subscriptionStart','subscriptionEnd','remainingDays','pricePerSeat','proratedAmount','invoiceItemId','invoiceId','invoiceUrl','status','chargedAt','failedAt','failureReason','retryCount','metadata','createdAt','updatedAt','teamBillingId','organizationBillingId']);

export default MonthlyProrationScalarFieldEnumSchema;
