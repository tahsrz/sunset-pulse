import { z } from 'zod';
import { JsonValueSchema } from '../inputTypeSchemas/JsonValueSchema'
import { IdentityProviderSchema } from '../inputTypeSchemas/IdentityProviderSchema'
import { UserPermissionRoleSchema } from '../inputTypeSchemas/UserPermissionRoleSchema'
import { SMSLockStateSchema } from '../inputTypeSchemas/SMSLockStateSchema'
import { CreationSourceSchema } from '../inputTypeSchemas/CreationSourceSchema'
import { emailSchema } from '../../zod-utils'
import { userMetadata } from '../../zod-utils'

/////////////////////////////////////////
// USER SCHEMA
/////////////////////////////////////////

export const UserSchema = z.object({
  identityProvider: IdentityProviderSchema,
  role: UserPermissionRoleSchema,
  smsLockState: SMSLockStateSchema,
  creationSource: CreationSourceSchema.nullable(),
  id: z.number().int(),
  uuid: z.string().uuid(),
  username: z.string().nullable(),
  name: z.string().nullable(),
  email: emailSchema,
  emailVerified: z.coerce.date().nullable(),
  bio: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  timeZone: z.string(),
  weekStart: z.string(),
  bufferTime: z.number().int(),
  hideBranding: z.boolean(),
  theme: z.string().nullable(),
  appTheme: z.string().nullable(),
  createdDate: z.coerce.date(),
  trialEndsAt: z.coerce.date().nullable(),
  lastActiveAt: z.coerce.date().nullable(),
  defaultScheduleId: z.number().int().nullable(),
  completedOnboarding: z.boolean(),
  locale: z.string().nullable(),
  timeFormat: z.number().int().nullable(),
  twoFactorSecret: z.string().nullable(),
  twoFactorEnabled: z.boolean(),
  backupCodes: z.string().nullable(),
  identityProviderId: z.string().nullable(),
  invitedTo: z.number().int().nullable(),
  brandColor: z.string().nullable(),
  darkBrandColor: z.string().nullable(),
  allowDynamicBooking: z.boolean().nullable(),
  allowSEOIndexing: z.boolean().nullable(),
  receiveMonthlyDigestEmail: z.boolean().nullable(),
  requiresBookerEmailVerification: z.boolean().nullable(),
  whitelistWorkflows: z.boolean(),
  metadata: userMetadata.nullable(),
  verified: z.boolean().nullable(),
  organizationId: z.number().int().nullable(),
  locked: z.boolean(),
  movedToProfileId: z.number().int().nullable(),
  isPlatformManaged: z.boolean(),
  smsLockReviewedByAdmin: z.boolean(),
  referralLinkId: z.string().nullable(),
  autoOptInFeatures: z.boolean(),
})

export type User = z.infer<typeof UserSchema>

export default UserSchema;
