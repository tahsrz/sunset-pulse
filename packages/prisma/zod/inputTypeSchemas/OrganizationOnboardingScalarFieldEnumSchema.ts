import { z } from 'zod';

export const OrganizationOnboardingScalarFieldEnumSchema = z.enum(['id','createdById','createdAt','orgOwnerEmail','error','updatedAt','organizationId','billingPeriod','pricePerSeat','seats','isPlatform','name','slug','logo','bio','brandColor','bannerUrl','isDomainConfigured','stripeCustomerId','stripeSubscriptionId','stripeSubscriptionItemId','invitedMembers','teams','isComplete']);

export default OrganizationOnboardingScalarFieldEnumSchema;
