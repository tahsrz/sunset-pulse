import { z } from 'zod';

export const OrganizationBillingScalarFieldEnumSchema = z.enum(['id','teamId','subscriptionId','subscriptionItemId','customerId','status','planName','subscriptionStart','subscriptionTrialEnd','subscriptionEnd','billingPeriod','billingMode','pricePerSeat','paidSeats','highWaterMark','highWaterMarkPeriodStart','createdAt','updatedAt']);

export default OrganizationBillingScalarFieldEnumSchema;
