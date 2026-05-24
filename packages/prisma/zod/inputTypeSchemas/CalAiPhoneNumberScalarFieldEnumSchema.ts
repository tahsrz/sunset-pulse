import { z } from 'zod';

export const CalAiPhoneNumberScalarFieldEnumSchema = z.enum(['id','userId','teamId','phoneNumber','provider','providerPhoneNumberId','createdAt','updatedAt','stripeCustomerId','stripeSubscriptionId','subscriptionStatus','inboundAgentId','outboundAgentId']);

export default CalAiPhoneNumberScalarFieldEnumSchema;
