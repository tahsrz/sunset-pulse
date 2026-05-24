import { z } from 'zod';

export const TeamScalarFieldEnumSchema = z.enum(['id','name','slug','logoUrl','calVideoLogo','appLogo','appIconLogo','bio','hideBranding','hideTeamProfileLink','isPrivate','hideBookATeamMember','createdAt','metadata','theme','rrResetInterval','rrTimestampBasis','brandColor','darkBrandColor','bannerUrl','parentId','timeFormat','timeZone','weekStart','isOrganization','pendingPayment','isPlatform','createdByOAuthClientId','smsLockState','smsLockReviewedByAdmin','bookingLimits','includeManagedEventsInLimits','autoOptInFeatures']);

export default TeamScalarFieldEnumSchema;
