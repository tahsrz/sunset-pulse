import { z } from 'zod';
import { JsonValueSchema } from '../inputTypeSchemas/JsonValueSchema'
import { RRResetIntervalSchema } from '../inputTypeSchemas/RRResetIntervalSchema'
import { RRTimestampBasisSchema } from '../inputTypeSchemas/RRTimestampBasisSchema'
import { SMSLockStateSchema } from '../inputTypeSchemas/SMSLockStateSchema'
import { teamMetadataSchema } from '../../zod-utils'
import { intervalLimitsType } from '../../zod-utils'

/////////////////////////////////////////
// TEAM SCHEMA
/////////////////////////////////////////

export const TeamSchema = z.object({
  rrResetInterval: RRResetIntervalSchema.nullable(),
  rrTimestampBasis: RRTimestampBasisSchema,
  smsLockState: SMSLockStateSchema,
  id: z.number().int(),
  name: z.string().min(1),
  slug: z.string().min(1).nullable(),
  logoUrl: z.string().nullable(),
  calVideoLogo: z.string().nullable(),
  appLogo: z.string().nullable(),
  appIconLogo: z.string().nullable(),
  bio: z.string().nullable(),
  hideBranding: z.boolean(),
  hideTeamProfileLink: z.boolean(),
  isPrivate: z.boolean(),
  hideBookATeamMember: z.boolean(),
  createdAt: z.coerce.date(),
  metadata: teamMetadataSchema.nullable(),
  theme: z.string().nullable(),
  brandColor: z.string().nullable(),
  darkBrandColor: z.string().nullable(),
  bannerUrl: z.string().nullable(),
  parentId: z.number().int().nullable(),
  timeFormat: z.number().int().nullable(),
  timeZone: z.string(),
  weekStart: z.string(),
  isOrganization: z.boolean(),
  pendingPayment: z.boolean(),
  isPlatform: z.boolean(),
  createdByOAuthClientId: z.string().nullable(),
  smsLockReviewedByAdmin: z.boolean(),
  bookingLimits: intervalLimitsType.nullable(),
  includeManagedEventsInLimits: z.boolean(),
  autoOptInFeatures: z.boolean(),
})

export type Team = z.infer<typeof TeamSchema>

export default TeamSchema;
