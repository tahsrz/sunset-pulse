import { z } from 'zod';
import { JsonValueSchema } from '../inputTypeSchemas/JsonValueSchema'
import { BillingPeriodSchema } from '../inputTypeSchemas/BillingPeriodSchema'
import { orgOnboardingInvitedMembersSchema } from '../../zod-utils'
import { orgOnboardingTeamsSchema } from '../../zod-utils'

/////////////////////////////////////////
// ORGANIZATION ONBOARDING SCHEMA
/////////////////////////////////////////

export const OrganizationOnboardingSchema = z.object({
  billingPeriod: BillingPeriodSchema,
  id: z.string().uuid(),
  createdById: z.number().int(),
  createdAt: z.coerce.date(),
  orgOwnerEmail: z.string(),
  error: z.string().nullable(),
  updatedAt: z.coerce.date(),
  organizationId: z.number().int().nullable(),
  pricePerSeat: z.number(),
  seats: z.number().int(),
  isPlatform: z.boolean(),
  name: z.string(),
  slug: z.string(),
  logo: z.string().nullable(),
  bio: z.string().nullable(),
  brandColor: z.string().nullable(),
  bannerUrl: z.string().nullable(),
  isDomainConfigured: z.boolean(),
  stripeCustomerId: z.string().nullable(),
  stripeSubscriptionId: z.string().nullable(),
  stripeSubscriptionItemId: z.string().nullable(),
  invitedMembers: orgOnboardingInvitedMembersSchema,
  teams: orgOnboardingTeamsSchema,
  isComplete: z.boolean(),
})

export type OrganizationOnboarding = z.infer<typeof OrganizationOnboardingSchema>

export default OrganizationOnboardingSchema;
