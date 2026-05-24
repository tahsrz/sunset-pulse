import { z } from 'zod';

export const UserScalarFieldEnumSchema = z.enum(['id','uuid','username','name','email','emailVerified','bio','avatarUrl','timeZone','weekStart','bufferTime','hideBranding','theme','appTheme','createdDate','trialEndsAt','lastActiveAt','defaultScheduleId','completedOnboarding','locale','timeFormat','twoFactorSecret','twoFactorEnabled','backupCodes','identityProvider','identityProviderId','invitedTo','brandColor','darkBrandColor','allowDynamicBooking','allowSEOIndexing','receiveMonthlyDigestEmail','requiresBookerEmailVerification','metadata','verified','role','organizationId','locked','movedToProfileId','isPlatformManaged','smsLockState','smsLockReviewedByAdmin','referralLinkId','creationSource','autoOptInFeatures']);

export default UserScalarFieldEnumSchema;
