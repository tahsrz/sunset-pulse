-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SchedulingType" AS ENUM ('roundRobin', 'collective', 'managed');

-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('unlimited', 'rolling', 'rolling_window', 'range');

-- CreateEnum
CREATE TYPE "CreationSource" AS ENUM ('api_v1', 'api_v2', 'webapp');

-- CreateEnum
CREATE TYPE "CancellationReasonRequirement" AS ENUM ('MANDATORY_BOTH', 'MANDATORY_HOST_ONLY', 'MANDATORY_ATTENDEE_ONLY', 'OPTIONAL_BOTH');

-- CreateEnum
CREATE TYPE "IdentityProvider" AS ENUM ('CAL', 'GOOGLE', 'SAML', 'AZUREAD');

-- CreateEnum
CREATE TYPE "UserPermissionRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "CreditUsageType" AS ENUM ('SMS', 'CAL_AI_PHONE_CALL');

-- CreateEnum
CREATE TYPE "CreditType" AS ENUM ('MONTHLY', 'ADDITIONAL');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('MEMBER', 'ADMIN', 'OWNER');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('cancelled', 'accepted', 'rejected', 'pending', 'awaiting_host');

-- CreateEnum
CREATE TYPE "EventTypeCustomInputType" AS ENUM ('text', 'textLong', 'number', 'bool', 'radio', 'phone');

-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('PENDING_BOOKING_CONFIRMATION');

-- CreateEnum
CREATE TYPE "PaymentOption" AS ENUM ('ON_BOOKING', 'HOLD');

-- CreateEnum
CREATE TYPE "WebhookTriggerEvents" AS ENUM ('BOOKING_CREATED', 'BOOKING_PAYMENT_INITIATED', 'BOOKING_PAID', 'BOOKING_RESCHEDULED', 'BOOKING_REQUESTED', 'BOOKING_CANCELLED', 'BOOKING_REJECTED', 'BOOKING_NO_SHOW_UPDATED', 'FORM_SUBMITTED', 'MEETING_ENDED', 'MEETING_STARTED', 'RECORDING_READY', 'RECORDING_TRANSCRIPTION_GENERATED', 'OOO_CREATED', 'AFTER_HOSTS_CAL_VIDEO_NO_SHOW', 'AFTER_GUESTS_CAL_VIDEO_NO_SHOW', 'FORM_SUBMITTED_NO_EVENT', 'DELEGATION_CREDENTIAL_ERROR', 'WRONG_ASSIGNMENT_REPORT');

-- CreateEnum
CREATE TYPE "AppCategories" AS ENUM ('calendar', 'messaging', 'other', 'payment', 'video', 'web3', 'automation', 'analytics', 'conferencing', 'crm');

-- CreateEnum
CREATE TYPE "TimeUnit" AS ENUM ('day', 'hour', 'minute');

-- CreateEnum
CREATE TYPE "FeatureType" AS ENUM ('RELEASE', 'EXPERIMENT', 'OPERATIONAL', 'KILL_SWITCH', 'PERMISSION');

-- CreateEnum
CREATE TYPE "RRResetInterval" AS ENUM ('MONTH', 'DAY');

-- CreateEnum
CREATE TYPE "RRTimestampBasis" AS ENUM ('CREATED_AT', 'START_TIME');

-- CreateEnum
CREATE TYPE "OAuthClientType" AS ENUM ('confidential', 'public');

-- CreateEnum
CREATE TYPE "OAuthClientStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "AccessScope" AS ENUM ('READ_BOOKING', 'READ_PROFILE');

-- CreateEnum
CREATE TYPE "RedirectType" AS ENUM ('user-event-type', 'team-event-type', 'user', 'team');

-- CreateEnum
CREATE TYPE "SMSLockState" AS ENUM ('LOCKED', 'UNLOCKED', 'REVIEW_NEEDED');

-- CreateEnum
CREATE TYPE "AttributeType" AS ENUM ('TEXT', 'NUMBER', 'SINGLE_SELECT', 'MULTI_SELECT');

-- CreateEnum
CREATE TYPE "AssignmentReasonEnum" AS ENUM ('REASSIGNED', 'RR_REASSIGNED', 'REROUTED', 'SALESFORCE_ASSIGNMENT');

-- CreateEnum
CREATE TYPE "EventTypeAutoTranslatedField" AS ENUM ('DESCRIPTION', 'TITLE');

-- CreateEnum
CREATE TYPE "WatchlistType" AS ENUM ('EMAIL', 'DOMAIN', 'USERNAME');

-- CreateEnum
CREATE TYPE "WatchlistAction" AS ENUM ('REPORT', 'BLOCK', 'ALERT');

-- CreateEnum
CREATE TYPE "WatchlistSource" AS ENUM ('MANUAL', 'FREE_DOMAIN_POLICY', 'SIGNUP');

-- CreateEnum
CREATE TYPE "BookingReportReason" AS ENUM ('SPAM', 'dont_know_person', 'OTHER');

-- CreateEnum
CREATE TYPE "BookingReportStatus" AS ENUM ('PENDING', 'DISMISSED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "SystemReportStatus" AS ENUM ('PENDING', 'BLOCKED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "WrongAssignmentReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'ANNUALLY');

-- CreateEnum
CREATE TYPE "BillingMode" AS ENUM ('SEATS', 'ACTIVE_USERS');

-- CreateEnum
CREATE TYPE "FilterSegmentScope" AS ENUM ('USER', 'TEAM');

-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('SYSTEM', 'CUSTOM');

-- CreateEnum
CREATE TYPE "BookingAuditType" AS ENUM ('record_created', 'record_updated', 'record_deleted');

-- CreateEnum
CREATE TYPE "BookingAuditAction" AS ENUM ('created', 'cancelled', 'accepted', 'rejected', 'pending', 'awaiting_host', 'rescheduled', 'attendee_added', 'attendee_removed', 'reassignment', 'location_changed', 'no_show_updated', 'reschedule_requested', 'seat_booked', 'seat_rescheduled');

-- CreateEnum
CREATE TYPE "BookingAuditSource" AS ENUM ('api_v1', 'api_v2', 'webapp', 'webhook', 'system', 'magic_link', 'unknown');

-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('user', 'guest', 'attendee', 'system', 'app');

-- CreateEnum
CREATE TYPE "PhoneNumberSubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'INCOMPLETE', 'INCOMPLETE_EXPIRED', 'TRIALING', 'UNPAID');

-- CreateEnum
CREATE TYPE "SeatChangeType" AS ENUM ('ADDITION', 'REMOVAL');

-- CreateEnum
CREATE TYPE "ProrationStatus" AS ENUM ('PENDING', 'INVOICE_CREATED', 'CHARGED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CalendarCacheEventStatus" AS ENUM ('confirmed', 'tentative', 'cancelled');

-- CreateTable
CREATE TABLE "Host" (
    "userId" INTEGER NOT NULL,
    "eventTypeId" INTEGER NOT NULL,
    "isFixed" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER,
    "weight" INTEGER,
    "weightAdjustment" INTEGER,
    "scheduleId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "groupId" TEXT,
    "memberId" INTEGER,

    CONSTRAINT "Host_pkey" PRIMARY KEY ("userId","eventTypeId")
);

-- CreateTable
CREATE TABLE "HostGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "eventTypeId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostLocation" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "eventTypeId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "credentialId" INTEGER,
    "link" TEXT,
    "address" TEXT,
    "phoneNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalVideoSettings" (
    "eventTypeId" INTEGER NOT NULL,
    "disableRecordingForOrganizer" BOOLEAN NOT NULL DEFAULT false,
    "disableRecordingForGuests" BOOLEAN NOT NULL DEFAULT false,
    "enableAutomaticTranscription" BOOLEAN NOT NULL DEFAULT false,
    "enableAutomaticRecordingForOrganizer" BOOLEAN NOT NULL DEFAULT false,
    "redirectUrlOnExit" TEXT,
    "disableTranscriptionForGuests" BOOLEAN NOT NULL DEFAULT false,
    "disableTranscriptionForOrganizer" BOOLEAN NOT NULL DEFAULT false,
    "requireEmailForGuests" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalVideoSettings_pkey" PRIMARY KEY ("eventTypeId")
);

-- CreateTable
CREATE TABLE "VideoCallGuest" (
    "id" TEXT NOT NULL,
    "bookingUid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoCallGuest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventType" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "interfaceLanguage" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "locations" JSONB,
    "length" INTEGER NOT NULL,
    "offsetStart" INTEGER NOT NULL DEFAULT 0,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER,
    "profileId" INTEGER,
    "teamId" INTEGER,
    "useEventLevelSelectedCalendars" BOOLEAN NOT NULL DEFAULT false,
    "eventName" TEXT,
    "parentId" INTEGER,
    "bookingFields" JSONB,
    "timeZone" TEXT,
    "periodType" "PeriodType" NOT NULL DEFAULT 'unlimited',
    "periodStartDate" TIMESTAMP(3),
    "periodEndDate" TIMESTAMP(3),
    "periodDays" INTEGER,
    "periodCountCalendarDays" BOOLEAN,
    "lockTimeZoneToggleOnBookingPage" BOOLEAN NOT NULL DEFAULT false,
    "lockedTimeZone" TEXT,
    "requiresConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "requiresConfirmationWillBlockSlot" BOOLEAN NOT NULL DEFAULT false,
    "requiresConfirmationForFreeEmail" BOOLEAN NOT NULL DEFAULT false,
    "requiresBookerEmailVerification" BOOLEAN NOT NULL DEFAULT false,
    "canSendCalVideoTranscriptionEmails" BOOLEAN NOT NULL DEFAULT true,
    "autoTranslateDescriptionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoTranslateInstantMeetingTitleEnabled" BOOLEAN NOT NULL DEFAULT true,
    "recurringEvent" JSONB,
    "disableGuests" BOOLEAN NOT NULL DEFAULT false,
    "hideCalendarNotes" BOOLEAN NOT NULL DEFAULT false,
    "hideCalendarEventDetails" BOOLEAN NOT NULL DEFAULT false,
    "minimumBookingNotice" INTEGER NOT NULL DEFAULT 120,
    "beforeEventBuffer" INTEGER NOT NULL DEFAULT 0,
    "afterEventBuffer" INTEGER NOT NULL DEFAULT 0,
    "seatsPerTimeSlot" INTEGER,
    "onlyShowFirstAvailableSlot" BOOLEAN NOT NULL DEFAULT false,
    "showOptimizedSlots" BOOLEAN DEFAULT false,
    "disableCancelling" BOOLEAN DEFAULT false,
    "disableRescheduling" BOOLEAN DEFAULT false,
    "minimumRescheduleNotice" INTEGER,
    "seatsShowAttendees" BOOLEAN DEFAULT false,
    "seatsShowAvailabilityCount" BOOLEAN DEFAULT true,
    "schedulingType" "SchedulingType",
    "scheduleId" INTEGER,
    "allowReschedulingCancelledBookings" BOOLEAN DEFAULT false,
    "price" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "slotInterval" INTEGER,
    "metadata" JSONB,
    "successRedirectUrl" TEXT,
    "forwardParamsSuccessRedirect" BOOLEAN DEFAULT true,
    "bookingLimits" JSONB,
    "durationLimits" JSONB,
    "isInstantEvent" BOOLEAN NOT NULL DEFAULT false,
    "instantMeetingExpiryTimeOffsetInSeconds" INTEGER NOT NULL DEFAULT 90,
    "instantMeetingScheduleId" INTEGER,
    "instantMeetingParameters" TEXT[],
    "assignAllTeamMembers" BOOLEAN NOT NULL DEFAULT false,
    "assignRRMembersUsingSegment" BOOLEAN NOT NULL DEFAULT false,
    "rrSegmentQueryValue" JSONB,
    "useEventTypeDestinationCalendarEmail" BOOLEAN NOT NULL DEFAULT false,
    "isRRWeightsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "maxLeadThreshold" INTEGER,
    "includeNoShowInRRCalculation" BOOLEAN NOT NULL DEFAULT false,
    "allowReschedulingPastBookings" BOOLEAN NOT NULL DEFAULT false,
    "hideOrganizerEmail" BOOLEAN NOT NULL DEFAULT false,
    "maxActiveBookingsPerBooker" INTEGER,
    "maxActiveBookingPerBookerOfferReschedule" BOOLEAN NOT NULL DEFAULT false,
    "customReplyToEmail" TEXT,
    "eventTypeColor" JSONB,
    "rescheduleWithSameRoundRobinHost" BOOLEAN NOT NULL DEFAULT false,
    "secondaryEmailId" INTEGER,
    "useBookerTimezone" BOOLEAN NOT NULL DEFAULT false,
    "restrictionScheduleId" INTEGER,
    "bookingRequiresAuthentication" BOOLEAN NOT NULL DEFAULT false,
    "rrHostSubsetEnabled" BOOLEAN NOT NULL DEFAULT false,
    "requiresCancellationReason" "CancellationReasonRequirement" DEFAULT 'MANDATORY_HOST_ONLY',
    "enablePerHostLocations" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "EventType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Credential" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "key" JSONB NOT NULL,
    "encryptedKey" TEXT,
    "userId" INTEGER,
    "teamId" INTEGER,
    "appId" TEXT,
    "subscriptionId" TEXT,
    "paymentStatus" TEXT,
    "billingCycleStart" INTEGER,
    "invalid" BOOLEAN DEFAULT false,
    "delegationCredentialId" TEXT,

    CONSTRAINT "Credential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DestinationCalendar" (
    "id" SERIAL NOT NULL,
    "integration" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "primaryEmail" TEXT,
    "userId" INTEGER,
    "eventTypeId" INTEGER,
    "credentialId" INTEGER,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "delegationCredentialId" TEXT,
    "customCalendarReminder" INTEGER,

    CONSTRAINT "DestinationCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPassword" (
    "hash" TEXT NOT NULL,
    "userId" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "TravelSchedule" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "timeZone" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "prevTimeZone" TEXT,

    CONSTRAINT "TravelSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "username" TEXT,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "bio" TEXT,
    "avatarUrl" TEXT,
    "timeZone" TEXT NOT NULL DEFAULT 'Europe/London',
    "weekStart" TEXT NOT NULL DEFAULT 'Sunday',
    "bufferTime" INTEGER NOT NULL DEFAULT 0,
    "hideBranding" BOOLEAN NOT NULL DEFAULT false,
    "theme" TEXT,
    "appTheme" TEXT,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trialEndsAt" TIMESTAMP(3),
    "lastActiveAt" TIMESTAMP(3),
    "defaultScheduleId" INTEGER,
    "completedOnboarding" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "timeFormat" INTEGER DEFAULT 12,
    "twoFactorSecret" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "backupCodes" TEXT,
    "identityProvider" "IdentityProvider" NOT NULL DEFAULT 'CAL',
    "identityProviderId" TEXT,
    "invitedTo" INTEGER,
    "brandColor" TEXT,
    "darkBrandColor" TEXT,
    "allowDynamicBooking" BOOLEAN DEFAULT true,
    "allowSEOIndexing" BOOLEAN DEFAULT true,
    "receiveMonthlyDigestEmail" BOOLEAN DEFAULT true,
    "requiresBookerEmailVerification" BOOLEAN DEFAULT false,
    "metadata" JSONB,
    "verified" BOOLEAN DEFAULT false,
    "role" "UserPermissionRole" NOT NULL DEFAULT 'USER',
    "organizationId" INTEGER,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "movedToProfileId" INTEGER,
    "isPlatformManaged" BOOLEAN NOT NULL DEFAULT false,
    "smsLockState" "SMSLockState" NOT NULL DEFAULT 'UNLOCKED',
    "smsLockReviewedByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "referralLinkId" TEXT,
    "creationSource" "CreationSource",
    "autoOptInFeatures" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationsSubscriptions" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "subscription" TEXT NOT NULL,

    CONSTRAINT "NotificationsSubscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" SERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "logoUrl" TEXT,
    "calVideoLogo" TEXT,
    "appLogo" TEXT,
    "appIconLogo" TEXT,
    "bio" TEXT,
    "hideBranding" BOOLEAN NOT NULL DEFAULT false,
    "hideTeamProfileLink" BOOLEAN NOT NULL DEFAULT false,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "hideBookATeamMember" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "theme" TEXT,
    "rrResetInterval" "RRResetInterval" DEFAULT 'MONTH',
    "rrTimestampBasis" "RRTimestampBasis" NOT NULL DEFAULT 'CREATED_AT',
    "brandColor" TEXT,
    "darkBrandColor" TEXT,
    "bannerUrl" TEXT,
    "parentId" INTEGER,
    "timeFormat" INTEGER,
    "timeZone" TEXT NOT NULL DEFAULT 'Europe/London',
    "weekStart" TEXT NOT NULL DEFAULT 'Sunday',
    "isOrganization" BOOLEAN NOT NULL DEFAULT false,
    "pendingPayment" BOOLEAN NOT NULL DEFAULT false,
    "isPlatform" BOOLEAN NOT NULL DEFAULT false,
    "createdByOAuthClientId" TEXT,
    "smsLockState" "SMSLockState" NOT NULL DEFAULT 'UNLOCKED',
    "smsLockReviewedByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "bookingLimits" JSONB,
    "includeManagedEventsInLimits" BOOLEAN NOT NULL DEFAULT false,
    "autoOptInFeatures" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditBalance" (
    "id" TEXT NOT NULL,
    "teamId" INTEGER,
    "userId" INTEGER,
    "additionalCredits" INTEGER NOT NULL DEFAULT 0,
    "limitReachedAt" TIMESTAMP(3),
    "warningSentAt" TIMESTAMP(3),

    CONSTRAINT "CreditBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditPurchaseLog" (
    "id" TEXT NOT NULL,
    "creditBalanceId" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditPurchaseLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditExpenseLog" (
    "id" TEXT NOT NULL,
    "creditBalanceId" TEXT NOT NULL,
    "bookingUid" TEXT,
    "credits" INTEGER,
    "creditType" "CreditType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "smsSid" TEXT,
    "smsSegments" INTEGER,
    "phoneNumber" TEXT,
    "email" TEXT,
    "callDuration" INTEGER,
    "creditFor" "CreditUsageType",
    "externalRef" TEXT,

    CONSTRAINT "CreditExpenseLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationSettings" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "isOrganizationConfigured" BOOLEAN NOT NULL DEFAULT false,
    "isOrganizationVerified" BOOLEAN NOT NULL DEFAULT false,
    "orgAutoAcceptEmail" TEXT NOT NULL,
    "lockEventTypeCreationForUsers" BOOLEAN NOT NULL DEFAULT false,
    "adminGetsNoSlotsNotification" BOOLEAN NOT NULL DEFAULT false,
    "isAdminReviewed" BOOLEAN NOT NULL DEFAULT false,
    "isAdminAPIEnabled" BOOLEAN NOT NULL DEFAULT false,
    "allowSEOIndexing" BOOLEAN NOT NULL DEFAULT false,
    "orgProfileRedirectsToVerifiedDomain" BOOLEAN NOT NULL DEFAULT false,
    "disablePhoneOnlySMSNotifications" BOOLEAN NOT NULL DEFAULT false,
    "disableAutofillOnBookingPage" BOOLEAN NOT NULL DEFAULT false,
    "orgAutoJoinOnSignup" BOOLEAN NOT NULL DEFAULT true,
    "disableAttendeeConfirmationEmail" BOOLEAN NOT NULL DEFAULT false,
    "disableAttendeeCancellationEmail" BOOLEAN NOT NULL DEFAULT false,
    "disableAttendeeRescheduledEmail" BOOLEAN NOT NULL DEFAULT false,
    "disableAttendeeRequestEmail" BOOLEAN NOT NULL DEFAULT false,
    "disableAttendeeReassignedEmail" BOOLEAN NOT NULL DEFAULT false,
    "disableAttendeeAwaitingPaymentEmail" BOOLEAN NOT NULL DEFAULT false,
    "disableAttendeeRescheduleRequestEmail" BOOLEAN NOT NULL DEFAULT false,
    "disableAttendeeLocationChangeEmail" BOOLEAN NOT NULL DEFAULT false,
    "disableAttendeeNewEventEmail" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OrganizationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "role" "MembershipRole" NOT NULL,
    "customRoleId" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "id" SERIAL NOT NULL,
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "expiresInDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "teamId" INTEGER,
    "secondaryEmailId" INTEGER,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstantMeetingToken" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "teamId" INTEGER NOT NULL,
    "bookingId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstantMeetingToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingReference" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "meetingId" TEXT,
    "thirdPartyRecurringEventId" TEXT,
    "meetingPassword" TEXT,
    "meetingUrl" TEXT,
    "bookingId" INTEGER,
    "externalCalendarId" TEXT,
    "deleted" BOOLEAN,
    "credentialId" INTEGER,
    "delegationCredentialId" TEXT,

    CONSTRAINT "BookingReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendee" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timeZone" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "locale" TEXT DEFAULT 'en',
    "bookingId" INTEGER,
    "noShow" BOOLEAN DEFAULT false,

    CONSTRAINT "Attendee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" SERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "userId" INTEGER,
    "userPrimaryEmail" TEXT,
    "eventTypeId" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "customInputs" JSONB,
    "responses" JSONB,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "status" "BookingStatus" NOT NULL DEFAULT 'accepted',
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "destinationCalendarId" INTEGER,
    "cancellationReason" TEXT,
    "rejectionReason" TEXT,
    "reassignReason" TEXT,
    "reassignById" INTEGER,
    "dynamicEventSlugRef" TEXT,
    "dynamicGroupSlugRef" TEXT,
    "rescheduled" BOOLEAN,
    "fromReschedule" TEXT,
    "recurringEventId" TEXT,
    "smsReminderNumber" TEXT,
    "scheduledJobs" TEXT[],
    "metadata" JSONB,
    "isRecorded" BOOLEAN NOT NULL DEFAULT false,
    "iCalUID" TEXT DEFAULT '',
    "iCalSequence" INTEGER NOT NULL DEFAULT 0,
    "rating" INTEGER,
    "ratingFeedback" TEXT,
    "noShowHost" BOOLEAN DEFAULT false,
    "oneTimePassword" TEXT,
    "cancelledBy" TEXT,
    "rescheduledBy" TEXT,
    "creationSource" "CreationSource",

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tracking" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "utm_term" TEXT,
    "utm_content" TEXT,

    CONSTRAINT "Tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "timeZone" TEXT,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Availability" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "eventTypeId" INTEGER,
    "days" INTEGER[],
    "startTime" TIME NOT NULL,
    "endTime" TIME NOT NULL,
    "date" DATE,
    "scheduleId" INTEGER,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SelectedCalendar" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "integration" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "credentialId" INTEGER,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "googleChannelId" TEXT,
    "googleChannelKind" TEXT,
    "googleChannelResourceId" TEXT,
    "googleChannelResourceUri" TEXT,
    "googleChannelExpiration" TEXT,
    "channelId" TEXT,
    "channelKind" TEXT,
    "channelResourceId" TEXT,
    "channelResourceUri" TEXT,
    "channelExpiration" TIMESTAMP(3),
    "syncSubscribedAt" TIMESTAMP(3),
    "syncSubscribedErrorAt" TIMESTAMP(3),
    "syncSubscribedErrorCount" INTEGER NOT NULL DEFAULT 0,
    "syncToken" TEXT,
    "syncedAt" TIMESTAMP(3),
    "syncErrorAt" TIMESTAMP(3),
    "syncErrorCount" INTEGER DEFAULT 0,
    "delegationCredentialId" TEXT,
    "error" TEXT,
    "lastErrorAt" TIMESTAMP(3),
    "watchAttempts" INTEGER NOT NULL DEFAULT 0,
    "unwatchAttempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "eventTypeId" INTEGER,

    CONSTRAINT "SelectedCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventTypeCustomInput" (
    "id" SERIAL NOT NULL,
    "eventTypeId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "type" "EventTypeCustomInputType" NOT NULL,
    "options" JSONB,
    "required" BOOLEAN NOT NULL,
    "placeholder" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "EventTypeCustomInput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResetPasswordRequest" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "email" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResetPasswordRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderMail" (
    "id" SERIAL NOT NULL,
    "referenceId" INTEGER NOT NULL,
    "reminderType" "ReminderType" NOT NULL,
    "elapsedMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReminderMail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" SERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "appId" TEXT,
    "bookingId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "fee" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "refunded" BOOLEAN NOT NULL,
    "data" JSONB NOT NULL,
    "externalId" TEXT NOT NULL,
    "paymentOption" "PaymentOption" DEFAULT 'ON_BOOKING',

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Webhook" (
    "id" TEXT NOT NULL,
    "userId" INTEGER,
    "teamId" INTEGER,
    "eventTypeId" INTEGER,
    "platformOAuthClientId" TEXT,
    "subscriberUrl" TEXT NOT NULL,
    "payloadTemplate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "eventTriggers" "WebhookTriggerEvents"[],
    "appId" TEXT,
    "secret" TEXT,
    "platform" BOOLEAN NOT NULL DEFAULT false,
    "time" INTEGER,
    "timeUnit" "TimeUnit",
    "version" TEXT NOT NULL DEFAULT '2021-10-20',

    CONSTRAINT "Webhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "teamId" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "hashedKey" TEXT NOT NULL,
    "appId" TEXT,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "ttl" INTEGER NOT NULL,
    "limit" INTEGER NOT NULL,
    "blockDuration" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HashedLink" (
    "id" SERIAL NOT NULL,
    "link" TEXT NOT NULL,
    "eventTypeId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "maxUsageCount" INTEGER NOT NULL DEFAULT 1,
    "usageCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "HashedLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "providerEmail" TEXT,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "App" (
    "slug" TEXT NOT NULL,
    "dirName" TEXT NOT NULL,
    "keys" JSONB,
    "categories" "AppCategories"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "App_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "rating" TEXT NOT NULL,
    "comment" TEXT,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deployment" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "logo" TEXT,
    "theme" JSONB,
    "licenseKey" TEXT,
    "signatureTokenEncrypted" TEXT,
    "agreedLicenseAt" TIMESTAMP(3),

    CONSTRAINT "Deployment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookScheduledTriggers" (
    "id" SERIAL NOT NULL,
    "jobName" TEXT,
    "subscriberUrl" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "startAfter" TIMESTAMP(3) NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "appId" TEXT,
    "webhookId" TEXT,
    "bookingId" INTEGER,

    CONSTRAINT "WebhookScheduledTriggers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingSeat" (
    "id" SERIAL NOT NULL,
    "referenceUid" TEXT NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "attendeeId" INTEGER NOT NULL,
    "data" JSONB,
    "metadata" JSONB,

    CONSTRAINT "BookingSeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerifiedNumber" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "teamId" INTEGER,
    "phoneNumber" TEXT NOT NULL,

    CONSTRAINT "VerifiedNumber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerifiedEmail" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "teamId" INTEGER,
    "email" TEXT NOT NULL,

    CONSTRAINT "VerifiedEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feature" (
    "slug" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "type" "FeatureType" DEFAULT 'RELEASE',
    "stale" BOOLEAN DEFAULT false,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" INTEGER,

    CONSTRAINT "Feature_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "UserFeatures" (
    "userId" INTEGER NOT NULL,
    "featureId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserFeatures_pkey" PRIMARY KEY ("userId","featureId")
);

-- CreateTable
CREATE TABLE "TeamFeatures" (
    "teamId" INTEGER NOT NULL,
    "featureId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamFeatures_pkey" PRIMARY KEY ("teamId","featureId")
);

-- CreateTable
CREATE TABLE "SelectedSlots" (
    "id" SERIAL NOT NULL,
    "eventTypeId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "slotUtcStartDate" TIMESTAMP(3) NOT NULL,
    "slotUtcEndDate" TIMESTAMP(3) NOT NULL,
    "uid" TEXT NOT NULL,
    "releaseAt" TIMESTAMP(3) NOT NULL,
    "isSeat" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SelectedSlots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthClient" (
    "clientId" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "clientSecret" TEXT,
    "clientType" "OAuthClientType" NOT NULL DEFAULT 'confidential',
    "name" TEXT NOT NULL,
    "purpose" TEXT,
    "logo" TEXT,
    "websiteUrl" TEXT,
    "rejectionReason" TEXT,
    "isTrusted" BOOLEAN NOT NULL DEFAULT false,
    "status" "OAuthClientStatus" NOT NULL DEFAULT 'approved',
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthClient_pkey" PRIMARY KEY ("clientId")
);

-- CreateTable
CREATE TABLE "AccessCode" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "clientId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "scopes" "AccessScope"[],
    "userId" INTEGER,
    "teamId" INTEGER,
    "codeChallenge" TEXT,
    "codeChallengeMethod" TEXT DEFAULT 'S256',

    CONSTRAINT "AccessCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingDenormalized" (
    "id" INTEGER NOT NULL,
    "uid" TEXT NOT NULL,
    "eventTypeId" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3),
    "location" TEXT,
    "paid" BOOLEAN NOT NULL,
    "status" "BookingStatus" NOT NULL,
    "rescheduled" BOOLEAN,
    "userId" INTEGER,
    "teamId" INTEGER,
    "eventLength" INTEGER,
    "eventParentId" INTEGER,
    "userEmail" TEXT,
    "userName" TEXT,
    "userUsername" TEXT,
    "ratingFeedback" TEXT,
    "rating" INTEGER,
    "noShowHost" BOOLEAN,
    "isTeamBooking" BOOLEAN NOT NULL,

    CONSTRAINT "BookingDenormalized_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarCache" (
    "id" TEXT,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "credentialId" INTEGER NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "CalendarCache_pkey" PRIMARY KEY ("credentialId","key")
);

-- CreateTable
CREATE TABLE "TempOrgRedirect" (
    "id" SERIAL NOT NULL,
    "from" TEXT NOT NULL,
    "fromOrgId" INTEGER NOT NULL,
    "type" "RedirectType" NOT NULL,
    "toUrl" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TempOrgRedirect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avatars" (
    "teamId" INTEGER NOT NULL DEFAULT 0,
    "userId" INTEGER NOT NULL DEFAULT 0,
    "data" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "isBanner" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "OutOfOfficeEntry" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "showNotePublicly" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER NOT NULL,
    "toUserId" INTEGER,
    "reasonId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutOfOfficeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutOfOfficeReason" (
    "id" SERIAL NOT NULL,
    "emoji" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "userId" INTEGER,

    CONSTRAINT "OutOfOfficeReason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserHolidaySettings" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "countryCode" TEXT,
    "disabledIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserHolidaySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HolidayCache" (
    "id" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HolidayCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformOAuthClient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "permissions" INTEGER NOT NULL,
    "logo" TEXT,
    "redirectUris" TEXT[],
    "organizationId" INTEGER NOT NULL,
    "bookingRedirectUri" TEXT,
    "bookingCancelRedirectUri" TEXT,
    "bookingRescheduleRedirectUri" TEXT,
    "areEmailsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "areDefaultEventTypesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "areCalendarEventsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformOAuthClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformAuthorizationToken" (
    "id" TEXT NOT NULL,
    "platformOAuthClientId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformAuthorizationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessToken" (
    "id" SERIAL NOT NULL,
    "secret" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "platformOAuthClientId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "AccessToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" SERIAL NOT NULL,
    "secret" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "platformOAuthClientId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DSyncData" (
    "id" SERIAL NOT NULL,
    "directoryId" TEXT NOT NULL,
    "tenant" TEXT NOT NULL,
    "organizationId" INTEGER,

    CONSTRAINT "DSyncData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DSyncTeamGroupMapping" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "directoryId" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,

    CONSTRAINT "DSyncTeamGroupMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecondaryEmail" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),

    CONSTRAINT "SecondaryEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "succeededAt" TIMESTAMP(3),
    "type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastError" TEXT,
    "lastFailedAttemptAt" TIMESTAMP(3),
    "referenceUid" TEXT,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagedOrganization" (
    "managedOrganizationId" INTEGER NOT NULL,
    "managerOrganizationId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PlatformBilling" (
    "id" INTEGER NOT NULL,
    "customerId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "priceId" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'none',
    "billingCycleStart" INTEGER,
    "billingCycleEnd" INTEGER,
    "overdue" BOOLEAN DEFAULT false,
    "managerBillingId" INTEGER,

    CONSTRAINT "PlatformBilling_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttributeOption" (
    "id" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isGroup" BOOLEAN NOT NULL DEFAULT false,
    "contains" TEXT[],

    CONSTRAINT "AttributeOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attribute" (
    "id" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "type" "AttributeType" NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "usersCanEditRelation" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isWeightsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Attribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttributeToUser" (
    "id" TEXT NOT NULL,
    "memberId" INTEGER NOT NULL,
    "attributeOptionId" TEXT NOT NULL,
    "weight" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" INTEGER,
    "createdByDSyncId" TEXT,
    "updatedAt" TIMESTAMP(3),
    "updatedById" INTEGER,
    "updatedByDSyncId" TEXT,

    CONSTRAINT "AttributeToUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentReason" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bookingId" INTEGER NOT NULL,
    "reasonEnum" "AssignmentReasonEnum" NOT NULL,
    "reasonString" TEXT NOT NULL,

    CONSTRAINT "AssignmentReason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DelegationCredential" (
    "id" TEXT NOT NULL,
    "workspacePlatformId" INTEGER NOT NULL,
    "serviceAccountKey" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "lastEnabledAt" TIMESTAMP(3),
    "lastDisabledAt" TIMESTAMP(3),
    "organizationId" INTEGER NOT NULL,
    "domain" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DelegationCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspacePlatform" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "defaultServiceAccountKey" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "WorkspacePlatform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventTypeTranslation" (
    "uid" TEXT NOT NULL,
    "eventTypeId" INTEGER NOT NULL,
    "field" "EventTypeAutoTranslatedField" NOT NULL,
    "sourceLocale" TEXT NOT NULL,
    "targetLocale" TEXT NOT NULL,
    "translatedText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "EventTypeTranslation_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "Watchlist" (
    "id" UUID NOT NULL,
    "type" "WatchlistType" NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" INTEGER,
    "action" "WatchlistAction" NOT NULL DEFAULT 'REPORT',
    "source" "WatchlistSource" NOT NULL DEFAULT 'MANUAL',
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Watchlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchlistAudit" (
    "id" UUID NOT NULL,
    "type" "WatchlistType" NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "action" "WatchlistAction" NOT NULL DEFAULT 'REPORT',
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedByUserId" INTEGER,
    "watchlistId" UUID,

    CONSTRAINT "WatchlistAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchlistEventAudit" (
    "id" UUID NOT NULL,
    "watchlistId" UUID NOT NULL,
    "eventTypeId" INTEGER NOT NULL,
    "actionTaken" "WatchlistAction" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchlistEventAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingReport" (
    "id" UUID NOT NULL,
    "bookingUid" TEXT NOT NULL,
    "bookerEmail" TEXT NOT NULL,
    "reportedById" INTEGER,
    "organizationId" INTEGER,
    "reason" "BookingReportReason" NOT NULL,
    "description" TEXT,
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "BookingReportStatus" NOT NULL DEFAULT 'PENDING',
    "systemStatus" "SystemReportStatus" NOT NULL DEFAULT 'PENDING',
    "watchlistId" UUID,
    "globalWatchlistId" UUID,

    CONSTRAINT "BookingReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WrongAssignmentReport" (
    "id" UUID NOT NULL,
    "bookingUid" TEXT NOT NULL,
    "reportedById" INTEGER,
    "correctAssignee" TEXT,
    "additionalNotes" TEXT NOT NULL,
    "teamId" INTEGER,
    "status" "WrongAssignmentReportStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WrongAssignmentReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationOnboarding" (
    "id" TEXT NOT NULL,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orgOwnerEmail" TEXT NOT NULL,
    "error" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" INTEGER,
    "billingPeriod" "BillingPeriod" NOT NULL,
    "pricePerSeat" DOUBLE PRECISION NOT NULL,
    "seats" INTEGER NOT NULL,
    "isPlatform" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "bio" TEXT,
    "brandColor" TEXT,
    "bannerUrl" TEXT,
    "isDomainConfigured" BOOLEAN NOT NULL DEFAULT false,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripeSubscriptionItemId" TEXT,
    "invitedMembers" JSONB NOT NULL DEFAULT '[]',
    "teams" JSONB NOT NULL DEFAULT '[]',
    "isComplete" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OrganizationOnboarding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalNotePreset" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "cancellationReason" TEXT,
    "teamId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternalNotePreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilterSegment" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "tableIdentifier" TEXT NOT NULL,
    "scope" "FilterSegmentScope" NOT NULL,
    "activeFilters" JSONB,
    "sorting" JSONB,
    "columnVisibility" JSONB,
    "columnSizing" JSONB,
    "perPage" INTEGER NOT NULL,
    "searchTerm" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,
    "teamId" INTEGER,

    CONSTRAINT "FilterSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFilterSegmentPreference" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tableIdentifier" TEXT NOT NULL,
    "segmentId" INTEGER,
    "systemSegmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserFilterSegmentPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingInternalNote" (
    "id" SERIAL NOT NULL,
    "notePresetId" INTEGER,
    "text" TEXT,
    "bookingId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingInternalNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "description" TEXT,
    "teamId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" "RoleType" NOT NULL DEFAULT 'CUSTOM',

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditActor" (
    "id" UUID NOT NULL,
    "type" "AuditActorType" NOT NULL,
    "userUuid" UUID,
    "attendeeId" INTEGER,
    "credentialId" INTEGER,
    "email" TEXT,
    "phone" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditActor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingAudit" (
    "id" UUID NOT NULL,
    "bookingUid" TEXT NOT NULL,
    "actorId" UUID NOT NULL,
    "type" "BookingAuditType" NOT NULL,
    "action" "BookingAuditAction" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "source" "BookingAuditSource" NOT NULL,
    "operationId" TEXT NOT NULL,
    "data" JSONB,
    "context" JSONB,

    CONSTRAINT "BookingAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" INTEGER,
    "teamId" INTEGER,
    "providerAgentId" TEXT NOT NULL,
    "inboundEventTypeId" INTEGER,
    "outboundEventTypeId" INTEGER,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalAiPhoneNumber" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "teamId" INTEGER,
    "phoneNumber" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerPhoneNumberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "subscriptionStatus" "PhoneNumberSubscriptionStatus",
    "inboundAgentId" TEXT,
    "outboundAgentId" TEXT,

    CONSTRAINT "CalAiPhoneNumber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamBilling" (
    "id" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "subscriptionItemId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "subscriptionStart" TIMESTAMP(3),
    "subscriptionTrialEnd" TIMESTAMP(3),
    "subscriptionEnd" TIMESTAMP(3),
    "billingPeriod" "BillingPeriod",
    "billingMode" "BillingMode" NOT NULL DEFAULT 'SEATS',
    "pricePerSeat" INTEGER,
    "paidSeats" INTEGER,
    "highWaterMark" INTEGER,
    "highWaterMarkPeriodStart" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamBilling_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationBilling" (
    "id" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "subscriptionItemId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "subscriptionStart" TIMESTAMP(3),
    "subscriptionTrialEnd" TIMESTAMP(3),
    "subscriptionEnd" TIMESTAMP(3),
    "billingPeriod" "BillingPeriod",
    "billingMode" "BillingMode" NOT NULL DEFAULT 'SEATS',
    "pricePerSeat" INTEGER,
    "paidSeats" INTEGER,
    "highWaterMark" INTEGER,
    "highWaterMarkPeriodStart" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationBilling_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeatChangeLog" (
    "id" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "changeType" "SeatChangeType" NOT NULL,
    "seatCount" INTEGER NOT NULL,
    "userId" INTEGER,
    "triggeredBy" INTEGER,
    "changeDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "monthKey" TEXT NOT NULL,
    "operationId" TEXT,
    "processedInProrationId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "teamBillingId" TEXT,
    "organizationBillingId" TEXT,

    CONSTRAINT "SeatChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyProration" (
    "id" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "monthKey" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "seatsAtStart" INTEGER NOT NULL,
    "seatsAdded" INTEGER NOT NULL,
    "seatsRemoved" INTEGER NOT NULL,
    "netSeatIncrease" INTEGER NOT NULL,
    "seatsAtEnd" INTEGER NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "subscriptionItemId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "subscriptionStart" TIMESTAMP(3) NOT NULL,
    "subscriptionEnd" TIMESTAMP(3) NOT NULL,
    "remainingDays" INTEGER NOT NULL,
    "pricePerSeat" INTEGER NOT NULL,
    "proratedAmount" INTEGER NOT NULL,
    "invoiceItemId" TEXT,
    "invoiceId" TEXT,
    "invoiceUrl" TEXT,
    "status" "ProrationStatus" NOT NULL DEFAULT 'PENDING',
    "chargedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "teamBillingId" TEXT,
    "organizationBillingId" TEXT,

    CONSTRAINT "MonthlyProration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarCacheEvent" (
    "id" TEXT NOT NULL,
    "selectedCalendarId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "externalEtag" TEXT NOT NULL,
    "iCalUID" TEXT,
    "iCalSequence" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "description" TEXT,
    "location" TEXT,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "timeZone" TEXT,
    "status" "CalendarCacheEventStatus" NOT NULL DEFAULT 'confirmed',
    "recurringEventId" TEXT,
    "originalStartTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "externalCreatedAt" TIMESTAMP(3),
    "externalUpdatedAt" TIMESTAMP(3),

    CONSTRAINT "CalendarCacheEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationAttributeSync" (
    "id" TEXT NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "integration" TEXT NOT NULL,
    "credentialId" INTEGER,
    "enabled" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationAttributeSync_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttributeSyncRule" (
    "id" TEXT NOT NULL,
    "integrationAttributeSyncId" TEXT NOT NULL,
    "rule" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttributeSyncRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttributeSyncFieldMapping" (
    "id" TEXT NOT NULL,
    "integrationFieldName" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "integrationAttributeSyncId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttributeSyncFieldMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_user_eventtype" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_user_eventtype_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_PlatformOAuthClientToUser" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_PlatformOAuthClientToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "Host_memberId_idx" ON "Host"("memberId");

-- CreateIndex
CREATE INDEX "Host_userId_idx" ON "Host"("userId");

-- CreateIndex
CREATE INDEX "Host_eventTypeId_idx" ON "Host"("eventTypeId");

-- CreateIndex
CREATE INDEX "Host_scheduleId_idx" ON "Host"("scheduleId");

-- CreateIndex
CREATE INDEX "HostGroup_name_idx" ON "HostGroup"("name");

-- CreateIndex
CREATE INDEX "HostGroup_eventTypeId_idx" ON "HostGroup"("eventTypeId");

-- CreateIndex
CREATE INDEX "HostLocation_credentialId_idx" ON "HostLocation"("credentialId");

-- CreateIndex
CREATE INDEX "HostLocation_eventTypeId_idx" ON "HostLocation"("eventTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "HostLocation_userId_eventTypeId_key" ON "HostLocation"("userId", "eventTypeId");

-- CreateIndex
CREATE INDEX "VideoCallGuest_bookingUid_idx" ON "VideoCallGuest"("bookingUid");

-- CreateIndex
CREATE INDEX "VideoCallGuest_email_idx" ON "VideoCallGuest"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VideoCallGuest_bookingUid_email_key" ON "VideoCallGuest"("bookingUid", "email");

-- CreateIndex
CREATE INDEX "EventType_userId_idx" ON "EventType"("userId");

-- CreateIndex
CREATE INDEX "EventType_teamId_idx" ON "EventType"("teamId");

-- CreateIndex
CREATE INDEX "EventType_profileId_idx" ON "EventType"("profileId");

-- CreateIndex
CREATE INDEX "EventType_scheduleId_idx" ON "EventType"("scheduleId");

-- CreateIndex
CREATE INDEX "EventType_secondaryEmailId_idx" ON "EventType"("secondaryEmailId");

-- CreateIndex
CREATE INDEX "EventType_parentId_idx" ON "EventType"("parentId");

-- CreateIndex
CREATE INDEX "EventType_parentId_teamId_idx" ON "EventType"("parentId", "teamId");

-- CreateIndex
CREATE INDEX "EventType_restrictionScheduleId_idx" ON "EventType"("restrictionScheduleId");

-- CreateIndex
CREATE UNIQUE INDEX "EventType_userId_slug_key" ON "EventType"("userId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "EventType_teamId_slug_key" ON "EventType"("teamId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "EventType_userId_parentId_key" ON "EventType"("userId", "parentId");

-- CreateIndex
CREATE INDEX "Credential_appId_idx" ON "Credential"("appId");

-- CreateIndex
CREATE INDEX "Credential_subscriptionId_idx" ON "Credential"("subscriptionId");

-- CreateIndex
CREATE INDEX "Credential_invalid_idx" ON "Credential"("invalid");

-- CreateIndex
CREATE INDEX "Credential_userId_delegationCredentialId_idx" ON "Credential"("userId", "delegationCredentialId");

-- CreateIndex
CREATE INDEX "Credential_teamId_idx" ON "Credential"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "DestinationCalendar_userId_key" ON "DestinationCalendar"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DestinationCalendar_eventTypeId_key" ON "DestinationCalendar"("eventTypeId");

-- CreateIndex
CREATE INDEX "DestinationCalendar_userId_idx" ON "DestinationCalendar"("userId");

-- CreateIndex
CREATE INDEX "DestinationCalendar_eventTypeId_idx" ON "DestinationCalendar"("eventTypeId");

-- CreateIndex
CREATE INDEX "DestinationCalendar_credentialId_idx" ON "DestinationCalendar"("credentialId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPassword_userId_key" ON "UserPassword"("userId");

-- CreateIndex
CREATE INDEX "TravelSchedule_startDate_idx" ON "TravelSchedule"("startDate");

-- CreateIndex
CREATE INDEX "TravelSchedule_endDate_idx" ON "TravelSchedule"("endDate");

-- CreateIndex
CREATE UNIQUE INDEX "users_uuid_key" ON "users"("uuid");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_emailVerified_idx" ON "users"("emailVerified");

-- CreateIndex
CREATE INDEX "users_identityProvider_idx" ON "users"("identityProvider");

-- CreateIndex
CREATE INDEX "users_identityProviderId_idx" ON "users"("identityProviderId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_username_key" ON "users"("email", "username");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_organizationId_key" ON "users"("username", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "users_movedToProfileId_key" ON "users"("movedToProfileId");

-- CreateIndex
CREATE INDEX "NotificationsSubscriptions_userId_subscription_idx" ON "NotificationsSubscriptions"("userId", "subscription");

-- CreateIndex
CREATE INDEX "Profile_uid_idx" ON "Profile"("uid");

-- CreateIndex
CREATE INDEX "Profile_userId_idx" ON "Profile"("userId");

-- CreateIndex
CREATE INDEX "Profile_organizationId_idx" ON "Profile"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_organizationId_key" ON "Profile"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_username_organizationId_key" ON "Profile"("username", "organizationId");

-- CreateIndex
CREATE INDEX "Team_parentId_idx" ON "Team"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_slug_parentId_key" ON "Team"("slug", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditBalance_teamId_key" ON "CreditBalance"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditBalance_userId_key" ON "CreditBalance"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditExpenseLog_externalRef_key" ON "CreditExpenseLog"("externalRef");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSettings_organizationId_key" ON "OrganizationSettings"("organizationId");

-- CreateIndex
CREATE INDEX "Membership_teamId_idx" ON "Membership"("teamId");

-- CreateIndex
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");

-- CreateIndex
CREATE INDEX "Membership_accepted_idx" ON "Membership"("accepted");

-- CreateIndex
CREATE INDEX "Membership_role_idx" ON "Membership"("role");

-- CreateIndex
CREATE INDEX "Membership_customRoleId_idx" ON "Membership"("customRoleId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_teamId_key" ON "Membership"("userId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE INDEX "VerificationToken_token_idx" ON "VerificationToken"("token");

-- CreateIndex
CREATE INDEX "VerificationToken_teamId_idx" ON "VerificationToken"("teamId");

-- CreateIndex
CREATE INDEX "VerificationToken_secondaryEmailId_idx" ON "VerificationToken"("secondaryEmailId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "InstantMeetingToken_token_key" ON "InstantMeetingToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "InstantMeetingToken_bookingId_key" ON "InstantMeetingToken"("bookingId");

-- CreateIndex
CREATE INDEX "InstantMeetingToken_token_idx" ON "InstantMeetingToken"("token");

-- CreateIndex
CREATE INDEX "BookingReference_bookingId_idx" ON "BookingReference"("bookingId");

-- CreateIndex
CREATE INDEX "BookingReference_type_idx" ON "BookingReference"("type");

-- CreateIndex
CREATE INDEX "BookingReference_uid_idx" ON "BookingReference"("uid");

-- CreateIndex
CREATE INDEX "Attendee_email_idx" ON "Attendee"("email");

-- CreateIndex
CREATE INDEX "Attendee_bookingId_idx" ON "Attendee"("bookingId");

-- CreateIndex
CREATE INDEX "Attendee_email_bookingId_idx" ON "Attendee"("email", "bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_uid_key" ON "Booking"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_idempotencyKey_key" ON "Booking"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_oneTimePassword_key" ON "Booking"("oneTimePassword");

-- CreateIndex
CREATE INDEX "Booking_eventTypeId_idx" ON "Booking"("eventTypeId");

-- CreateIndex
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");

-- CreateIndex
CREATE INDEX "Booking_destinationCalendarId_idx" ON "Booking"("destinationCalendarId");

-- CreateIndex
CREATE INDEX "Booking_recurringEventId_idx" ON "Booking"("recurringEventId");

-- CreateIndex
CREATE INDEX "Booking_uid_idx" ON "Booking"("uid");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "Booking_startTime_endTime_status_idx" ON "Booking"("startTime", "endTime", "status");

-- CreateIndex
CREATE INDEX "Booking_fromReschedule_idx" ON "Booking"("fromReschedule");

-- CreateIndex
CREATE INDEX "Booking_userId_endTime_idx" ON "Booking"("userId", "endTime");

-- CreateIndex
CREATE INDEX "Booking_userId_status_startTime_idx" ON "Booking"("userId", "status", "startTime");

-- CreateIndex
CREATE INDEX "Booking_eventTypeId_status_idx" ON "Booking"("eventTypeId", "status");

-- CreateIndex
CREATE INDEX "Booking_userId_createdAt_idx" ON "Booking"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Tracking_bookingId_key" ON "Tracking"("bookingId");

-- CreateIndex
CREATE INDEX "Schedule_userId_idx" ON "Schedule"("userId");

-- CreateIndex
CREATE INDEX "Availability_userId_idx" ON "Availability"("userId");

-- CreateIndex
CREATE INDEX "Availability_eventTypeId_idx" ON "Availability"("eventTypeId");

-- CreateIndex
CREATE INDEX "Availability_scheduleId_idx" ON "Availability"("scheduleId");

-- CreateIndex
CREATE INDEX "SelectedCalendar_userId_idx" ON "SelectedCalendar"("userId");

-- CreateIndex
CREATE INDEX "SelectedCalendar_externalId_idx" ON "SelectedCalendar"("externalId");

-- CreateIndex
CREATE INDEX "SelectedCalendar_eventTypeId_idx" ON "SelectedCalendar"("eventTypeId");

-- CreateIndex
CREATE INDEX "SelectedCalendar_credentialId_idx" ON "SelectedCalendar"("credentialId");

-- CreateIndex
CREATE INDEX "SelectedCalendar_channelId_idx" ON "SelectedCalendar"("channelId");

-- CreateIndex
CREATE INDEX "SelectedCalendar_watch_idx" ON "SelectedCalendar"("integration", "googleChannelExpiration", "error", "watchAttempts", "maxAttempts");

-- CreateIndex
CREATE INDEX "SelectedCalendar_unwatch_idx" ON "SelectedCalendar"("integration", "googleChannelExpiration", "error", "unwatchAttempts", "maxAttempts");

-- CreateIndex
CREATE UNIQUE INDEX "SelectedCalendar_userId_integration_externalId_eventTypeId_key" ON "SelectedCalendar"("userId", "integration", "externalId", "eventTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "SelectedCalendar_googleChannelId_eventTypeId_key" ON "SelectedCalendar"("googleChannelId", "eventTypeId");

-- CreateIndex
CREATE INDEX "EventTypeCustomInput_eventTypeId_idx" ON "EventTypeCustomInput"("eventTypeId");

-- CreateIndex
CREATE INDEX "ReminderMail_referenceId_idx" ON "ReminderMail"("referenceId");

-- CreateIndex
CREATE INDEX "ReminderMail_reminderType_idx" ON "ReminderMail"("reminderType");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_uid_key" ON "Payment"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_externalId_key" ON "Payment"("externalId");

-- CreateIndex
CREATE INDEX "Payment_bookingId_idx" ON "Payment"("bookingId");

-- CreateIndex
CREATE INDEX "Payment_externalId_idx" ON "Payment"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Webhook_id_key" ON "Webhook"("id");

-- CreateIndex
CREATE INDEX "Webhook_active_idx" ON "Webhook"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Webhook_userId_subscriberUrl_key" ON "Webhook"("userId", "subscriberUrl");

-- CreateIndex
CREATE UNIQUE INDEX "Webhook_platformOAuthClientId_subscriberUrl_key" ON "Webhook"("platformOAuthClientId", "subscriberUrl");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_id_key" ON "ApiKey"("id");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_hashedKey_key" ON "ApiKey"("hashedKey");

-- CreateIndex
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");

-- CreateIndex
CREATE INDEX "RateLimit_apiKeyId_idx" ON "RateLimit"("apiKeyId");

-- CreateIndex
CREATE UNIQUE INDEX "HashedLink_link_key" ON "HashedLink"("link");

-- CreateIndex
CREATE INDEX "HashedLink_eventTypeId_idx" ON "HashedLink"("eventTypeId");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Account_type_idx" ON "Account"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "App_slug_key" ON "App"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "App_dirName_key" ON "App"("dirName");

-- CreateIndex
CREATE INDEX "App_enabled_idx" ON "App"("enabled");

-- CreateIndex
CREATE INDEX "Feedback_userId_idx" ON "Feedback"("userId");

-- CreateIndex
CREATE INDEX "Feedback_rating_idx" ON "Feedback"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "BookingSeat_referenceUid_key" ON "BookingSeat"("referenceUid");

-- CreateIndex
CREATE UNIQUE INDEX "BookingSeat_attendeeId_key" ON "BookingSeat"("attendeeId");

-- CreateIndex
CREATE INDEX "BookingSeat_bookingId_idx" ON "BookingSeat"("bookingId");

-- CreateIndex
CREATE INDEX "BookingSeat_attendeeId_idx" ON "BookingSeat"("attendeeId");

-- CreateIndex
CREATE INDEX "VerifiedNumber_userId_idx" ON "VerifiedNumber"("userId");

-- CreateIndex
CREATE INDEX "VerifiedNumber_teamId_idx" ON "VerifiedNumber"("teamId");

-- CreateIndex
CREATE INDEX "VerifiedEmail_userId_idx" ON "VerifiedEmail"("userId");

-- CreateIndex
CREATE INDEX "VerifiedEmail_teamId_idx" ON "VerifiedEmail"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Feature_slug_key" ON "Feature"("slug");

-- CreateIndex
CREATE INDEX "Feature_enabled_idx" ON "Feature"("enabled");

-- CreateIndex
CREATE INDEX "Feature_stale_idx" ON "Feature"("stale");

-- CreateIndex
CREATE INDEX "UserFeatures_userId_featureId_idx" ON "UserFeatures"("userId", "featureId");

-- CreateIndex
CREATE INDEX "TeamFeatures_teamId_featureId_idx" ON "TeamFeatures"("teamId", "featureId");

-- CreateIndex
CREATE UNIQUE INDEX "SelectedSlots_userId_slotUtcStartDate_slotUtcEndDate_uid_key" ON "SelectedSlots"("userId", "slotUtcStartDate", "slotUtcEndDate", "uid");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthClient_clientId_key" ON "OAuthClient"("clientId");

-- CreateIndex
CREATE INDEX "OAuthClient_userId_idx" ON "OAuthClient"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingDenormalized_id_key" ON "BookingDenormalized"("id");

-- CreateIndex
CREATE INDEX "BookingDenormalized_userId_idx" ON "BookingDenormalized"("userId");

-- CreateIndex
CREATE INDEX "BookingDenormalized_createdAt_idx" ON "BookingDenormalized"("createdAt");

-- CreateIndex
CREATE INDEX "BookingDenormalized_eventTypeId_idx" ON "BookingDenormalized"("eventTypeId");

-- CreateIndex
CREATE INDEX "BookingDenormalized_eventParentId_idx" ON "BookingDenormalized"("eventParentId");

-- CreateIndex
CREATE INDEX "BookingDenormalized_teamId_idx" ON "BookingDenormalized"("teamId");

-- CreateIndex
CREATE INDEX "BookingDenormalized_startTime_idx" ON "BookingDenormalized"("startTime");

-- CreateIndex
CREATE INDEX "BookingDenormalized_endTime_idx" ON "BookingDenormalized"("endTime");

-- CreateIndex
CREATE INDEX "BookingDenormalized_status_idx" ON "BookingDenormalized"("status");

-- CreateIndex
CREATE INDEX "BookingDenormalized_teamId_isTeamBooking_idx" ON "BookingDenormalized"("teamId", "isTeamBooking");

-- CreateIndex
CREATE INDEX "BookingDenormalized_userId_isTeamBooking_idx" ON "BookingDenormalized"("userId", "isTeamBooking");

-- CreateIndex
CREATE INDEX "BookingDenormalized_startTime_endTime_idx" ON "BookingDenormalized"("startTime", "endTime");

-- CreateIndex
CREATE INDEX "CalendarCache_userId_key_idx" ON "CalendarCache"("userId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarCache_credentialId_key_key" ON "CalendarCache"("credentialId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "TempOrgRedirect_from_type_fromOrgId_key" ON "TempOrgRedirect"("from", "type", "fromOrgId");

-- CreateIndex
CREATE UNIQUE INDEX "avatars_objectKey_key" ON "avatars"("objectKey");

-- CreateIndex
CREATE UNIQUE INDEX "avatars_teamId_userId_isBanner_key" ON "avatars"("teamId", "userId", "isBanner");

-- CreateIndex
CREATE UNIQUE INDEX "OutOfOfficeEntry_uuid_key" ON "OutOfOfficeEntry"("uuid");

-- CreateIndex
CREATE INDEX "OutOfOfficeEntry_uuid_idx" ON "OutOfOfficeEntry"("uuid");

-- CreateIndex
CREATE INDEX "OutOfOfficeEntry_userId_idx" ON "OutOfOfficeEntry"("userId");

-- CreateIndex
CREATE INDEX "OutOfOfficeEntry_toUserId_idx" ON "OutOfOfficeEntry"("toUserId");

-- CreateIndex
CREATE INDEX "OutOfOfficeEntry_start_end_idx" ON "OutOfOfficeEntry"("start", "end");

-- CreateIndex
CREATE UNIQUE INDEX "OutOfOfficeReason_reason_key" ON "OutOfOfficeReason"("reason");

-- CreateIndex
CREATE UNIQUE INDEX "UserHolidaySettings_userId_key" ON "UserHolidaySettings"("userId");

-- CreateIndex
CREATE INDEX "HolidayCache_countryCode_year_idx" ON "HolidayCache"("countryCode", "year");

-- CreateIndex
CREATE INDEX "HolidayCache_countryCode_date_idx" ON "HolidayCache"("countryCode", "date");

-- CreateIndex
CREATE UNIQUE INDEX "HolidayCache_countryCode_eventId_key" ON "HolidayCache"("countryCode", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformAuthorizationToken_userId_platformOAuthClientId_key" ON "PlatformAuthorizationToken"("userId", "platformOAuthClientId");

-- CreateIndex
CREATE UNIQUE INDEX "AccessToken_secret_key" ON "AccessToken"("secret");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_secret_key" ON "RefreshToken"("secret");

-- CreateIndex
CREATE UNIQUE INDEX "DSyncData_directoryId_key" ON "DSyncData"("directoryId");

-- CreateIndex
CREATE UNIQUE INDEX "DSyncData_organizationId_key" ON "DSyncData"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "DSyncTeamGroupMapping_teamId_groupName_key" ON "DSyncTeamGroupMapping"("teamId", "groupName");

-- CreateIndex
CREATE INDEX "SecondaryEmail_userId_idx" ON "SecondaryEmail"("userId");

-- CreateIndex
CREATE INDEX "SecondaryEmail_email_emailVerified_idx" ON "SecondaryEmail"("email", "emailVerified");

-- CreateIndex
CREATE UNIQUE INDEX "SecondaryEmail_email_key" ON "SecondaryEmail"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SecondaryEmail_userId_email_key" ON "SecondaryEmail"("userId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Task_id_key" ON "Task"("id");

-- CreateIndex
CREATE INDEX "Task_succeededAt_idx" ON "Task"("succeededAt");

-- CreateIndex
CREATE INDEX "Task_scheduledAt_succeededAt_idx" ON "Task"("scheduledAt", "succeededAt");

-- CreateIndex
CREATE UNIQUE INDEX "Task_referenceUid_type_key" ON "Task"("referenceUid", "type");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedOrganization_managedOrganizationId_key" ON "ManagedOrganization"("managedOrganizationId");

-- CreateIndex
CREATE INDEX "ManagedOrganization_managerOrganizationId_idx" ON "ManagedOrganization"("managerOrganizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedOrganization_managerOrganizationId_managedOrganizati_key" ON "ManagedOrganization"("managerOrganizationId", "managedOrganizationId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformBilling_id_key" ON "PlatformBilling"("id");

-- CreateIndex
CREATE INDEX "Attribute_teamId_idx" ON "Attribute"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Attribute_teamId_slug_key" ON "Attribute"("teamId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "AttributeToUser_memberId_attributeOptionId_key" ON "AttributeToUser"("memberId", "attributeOptionId");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentReason_id_key" ON "AssignmentReason"("id");

-- CreateIndex
CREATE INDEX "AssignmentReason_bookingId_idx" ON "AssignmentReason"("bookingId");

-- CreateIndex
CREATE INDEX "DelegationCredential_enabled_idx" ON "DelegationCredential"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "DelegationCredential_organizationId_domain_key" ON "DelegationCredential"("organizationId", "domain");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspacePlatform_slug_key" ON "WorkspacePlatform"("slug");

-- CreateIndex
CREATE INDEX "EventTypeTranslation_eventTypeId_field_targetLocale_idx" ON "EventTypeTranslation"("eventTypeId", "field", "targetLocale");

-- CreateIndex
CREATE UNIQUE INDEX "EventTypeTranslation_eventTypeId_field_targetLocale_key" ON "EventTypeTranslation"("eventTypeId", "field", "targetLocale");

-- CreateIndex
CREATE INDEX "Watchlist_isGlobal_action_organizationId_type_value_idx" ON "Watchlist"("isGlobal", "action", "organizationId", "type", "value");

-- CreateIndex
CREATE UNIQUE INDEX "Watchlist_type_value_organizationId_key" ON "Watchlist"("type", "value", "organizationId");

-- CreateIndex
CREATE INDEX "WatchlistAudit_watchlistId_changedAt_idx" ON "WatchlistAudit"("watchlistId", "changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BookingReport_bookingUid_key" ON "BookingReport"("bookingUid");

-- CreateIndex
CREATE INDEX "BookingReport_bookerEmail_idx" ON "BookingReport"("bookerEmail");

-- CreateIndex
CREATE INDEX "BookingReport_reportedById_idx" ON "BookingReport"("reportedById");

-- CreateIndex
CREATE INDEX "BookingReport_organizationId_idx" ON "BookingReport"("organizationId");

-- CreateIndex
CREATE INDEX "BookingReport_watchlistId_idx" ON "BookingReport"("watchlistId");

-- CreateIndex
CREATE INDEX "BookingReport_globalWatchlistId_idx" ON "BookingReport"("globalWatchlistId");

-- CreateIndex
CREATE INDEX "BookingReport_systemStatus_idx" ON "BookingReport"("systemStatus");

-- CreateIndex
CREATE INDEX "BookingReport_createdAt_idx" ON "BookingReport"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WrongAssignmentReport_bookingUid_key" ON "WrongAssignmentReport"("bookingUid");

-- CreateIndex
CREATE INDEX "WrongAssignmentReport_reportedById_idx" ON "WrongAssignmentReport"("reportedById");

-- CreateIndex
CREATE INDEX "WrongAssignmentReport_teamId_idx" ON "WrongAssignmentReport"("teamId");

-- CreateIndex
CREATE INDEX "WrongAssignmentReport_status_idx" ON "WrongAssignmentReport"("status");

-- CreateIndex
CREATE INDEX "WrongAssignmentReport_reviewedById_idx" ON "WrongAssignmentReport"("reviewedById");

-- CreateIndex
CREATE INDEX "WrongAssignmentReport_createdAt_idx" ON "WrongAssignmentReport"("createdAt");

-- CreateIndex
CREATE INDEX "WrongAssignmentReport_teamId_status_createdAt_idx" ON "WrongAssignmentReport"("teamId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationOnboarding_orgOwnerEmail_key" ON "OrganizationOnboarding"("orgOwnerEmail");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationOnboarding_organizationId_key" ON "OrganizationOnboarding"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationOnboarding_stripeCustomerId_key" ON "OrganizationOnboarding"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "OrganizationOnboarding_orgOwnerEmail_idx" ON "OrganizationOnboarding"("orgOwnerEmail");

-- CreateIndex
CREATE INDEX "OrganizationOnboarding_stripeCustomerId_idx" ON "OrganizationOnboarding"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "InternalNotePreset_teamId_idx" ON "InternalNotePreset"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "InternalNotePreset_teamId_name_key" ON "InternalNotePreset"("teamId", "name");

-- CreateIndex
CREATE INDEX "FilterSegment_scope_userId_tableIdentifier_idx" ON "FilterSegment"("scope", "userId", "tableIdentifier");

-- CreateIndex
CREATE INDEX "FilterSegment_scope_teamId_tableIdentifier_idx" ON "FilterSegment"("scope", "teamId", "tableIdentifier");

-- CreateIndex
CREATE INDEX "UserFilterSegmentPreference_userId_idx" ON "UserFilterSegmentPreference"("userId");

-- CreateIndex
CREATE INDEX "UserFilterSegmentPreference_segmentId_idx" ON "UserFilterSegmentPreference"("segmentId");

-- CreateIndex
CREATE UNIQUE INDEX "UserFilterSegmentPreference_userId_tableIdentifier_key" ON "UserFilterSegmentPreference"("userId", "tableIdentifier");

-- CreateIndex
CREATE INDEX "BookingInternalNote_bookingId_idx" ON "BookingInternalNote"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingInternalNote_bookingId_notePresetId_key" ON "BookingInternalNote"("bookingId", "notePresetId");

-- CreateIndex
CREATE INDEX "Role_teamId_idx" ON "Role"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_teamId_key" ON "Role"("name", "teamId");

-- CreateIndex
CREATE INDEX "RolePermission_roleId_idx" ON "RolePermission"("roleId");

-- CreateIndex
CREATE INDEX "RolePermission_action_idx" ON "RolePermission"("action");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_resource_action_key" ON "RolePermission"("roleId", "resource", "action");

-- CreateIndex
CREATE INDEX "AuditActor_email_idx" ON "AuditActor"("email");

-- CreateIndex
CREATE INDEX "AuditActor_userUuid_idx" ON "AuditActor"("userUuid");

-- CreateIndex
CREATE INDEX "AuditActor_attendeeId_idx" ON "AuditActor"("attendeeId");

-- CreateIndex
CREATE INDEX "AuditActor_credentialId_idx" ON "AuditActor"("credentialId");

-- CreateIndex
CREATE UNIQUE INDEX "AuditActor_userUuid_key" ON "AuditActor"("userUuid");

-- CreateIndex
CREATE UNIQUE INDEX "AuditActor_attendeeId_key" ON "AuditActor"("attendeeId");

-- CreateIndex
CREATE UNIQUE INDEX "AuditActor_credentialId_key" ON "AuditActor"("credentialId");

-- CreateIndex
CREATE UNIQUE INDEX "AuditActor_email_key" ON "AuditActor"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AuditActor_phone_key" ON "AuditActor"("phone");

-- CreateIndex
CREATE INDEX "BookingAudit_actorId_idx" ON "BookingAudit"("actorId");

-- CreateIndex
CREATE INDEX "BookingAudit_bookingUid_idx" ON "BookingAudit"("bookingUid");

-- CreateIndex
CREATE INDEX "BookingAudit_timestamp_idx" ON "BookingAudit"("timestamp");

-- CreateIndex
CREATE INDEX "BookingAudit_operationId_idx" ON "BookingAudit"("operationId");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_providerAgentId_key" ON "Agent"("providerAgentId");

-- CreateIndex
CREATE INDEX "Agent_userId_idx" ON "Agent"("userId");

-- CreateIndex
CREATE INDEX "Agent_teamId_idx" ON "Agent"("teamId");

-- CreateIndex
CREATE INDEX "Agent_inboundEventTypeId_idx" ON "Agent"("inboundEventTypeId");

-- CreateIndex
CREATE INDEX "Agent_outboundEventTypeId_idx" ON "Agent"("outboundEventTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "CalAiPhoneNumber_phoneNumber_key" ON "CalAiPhoneNumber"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CalAiPhoneNumber_providerPhoneNumberId_key" ON "CalAiPhoneNumber"("providerPhoneNumberId");

-- CreateIndex
CREATE UNIQUE INDEX "CalAiPhoneNumber_stripeSubscriptionId_key" ON "CalAiPhoneNumber"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "CalAiPhoneNumber_userId_idx" ON "CalAiPhoneNumber"("userId");

-- CreateIndex
CREATE INDEX "CalAiPhoneNumber_teamId_idx" ON "CalAiPhoneNumber"("teamId");

-- CreateIndex
CREATE INDEX "CalAiPhoneNumber_inboundAgentId_idx" ON "CalAiPhoneNumber"("inboundAgentId");

-- CreateIndex
CREATE INDEX "CalAiPhoneNumber_outboundAgentId_idx" ON "CalAiPhoneNumber"("outboundAgentId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamBilling_teamId_key" ON "TeamBilling"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamBilling_subscriptionId_key" ON "TeamBilling"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationBilling_teamId_key" ON "OrganizationBilling"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationBilling_subscriptionId_key" ON "OrganizationBilling"("subscriptionId");

-- CreateIndex
CREATE INDEX "SeatChangeLog_teamId_monthKey_idx" ON "SeatChangeLog"("teamId", "monthKey");

-- CreateIndex
CREATE INDEX "SeatChangeLog_teamId_processedInProrationId_idx" ON "SeatChangeLog"("teamId", "processedInProrationId");

-- CreateIndex
CREATE INDEX "SeatChangeLog_monthKey_idx" ON "SeatChangeLog"("monthKey");

-- CreateIndex
CREATE UNIQUE INDEX "SeatChangeLog_teamId_operationId_key" ON "SeatChangeLog"("teamId", "operationId");

-- CreateIndex
CREATE INDEX "MonthlyProration_monthKey_status_idx" ON "MonthlyProration"("monthKey", "status");

-- CreateIndex
CREATE INDEX "MonthlyProration_status_idx" ON "MonthlyProration"("status");

-- CreateIndex
CREATE INDEX "MonthlyProration_teamId_idx" ON "MonthlyProration"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyProration_teamId_monthKey_key" ON "MonthlyProration"("teamId", "monthKey");

-- CreateIndex
CREATE INDEX "CalendarCacheEvent_start_end_status_idx" ON "CalendarCacheEvent"("start", "end", "status");

-- CreateIndex
CREATE INDEX "CalendarCacheEvent_selectedCalendarId_iCalUID_idx" ON "CalendarCacheEvent"("selectedCalendarId", "iCalUID");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarCacheEvent_selectedCalendarId_externalId_key" ON "CalendarCacheEvent"("selectedCalendarId", "externalId");

-- CreateIndex
CREATE INDEX "IntegrationAttributeSync_organizationId_idx" ON "IntegrationAttributeSync"("organizationId");

-- CreateIndex
CREATE INDEX "IntegrationAttributeSync_credentialId_idx" ON "IntegrationAttributeSync"("credentialId");

-- CreateIndex
CREATE UNIQUE INDEX "AttributeSyncRule_integrationAttributeSyncId_key" ON "AttributeSyncRule"("integrationAttributeSyncId");

-- CreateIndex
CREATE INDEX "AttributeSyncFieldMapping_integrationAttributeSyncId_idx" ON "AttributeSyncFieldMapping"("integrationAttributeSyncId");

-- CreateIndex
CREATE UNIQUE INDEX "AttributeSyncFieldMapping_integrationAttributeSyncId_attrib_key" ON "AttributeSyncFieldMapping"("integrationAttributeSyncId", "attributeId");

-- CreateIndex
CREATE INDEX "_user_eventtype_B_index" ON "_user_eventtype"("B");

-- CreateIndex
CREATE INDEX "_PlatformOAuthClientToUser_B_index" ON "_PlatformOAuthClientToUser"("B");

-- AddForeignKey
ALTER TABLE "Host" ADD CONSTRAINT "Host_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Host" ADD CONSTRAINT "Host_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Host" ADD CONSTRAINT "Host_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Host" ADD CONSTRAINT "Host_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "HostGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Host" ADD CONSTRAINT "Host_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostGroup" ADD CONSTRAINT "HostGroup_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostLocation" ADD CONSTRAINT "HostLocation_userId_eventTypeId_fkey" FOREIGN KEY ("userId", "eventTypeId") REFERENCES "Host"("userId", "eventTypeId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostLocation" ADD CONSTRAINT "HostLocation_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalVideoSettings" ADD CONSTRAINT "CalVideoSettings_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventType" ADD CONSTRAINT "EventType_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventType" ADD CONSTRAINT "EventType_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventType" ADD CONSTRAINT "EventType_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventType" ADD CONSTRAINT "EventType_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventType" ADD CONSTRAINT "EventType_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventType" ADD CONSTRAINT "EventType_instantMeetingScheduleId_fkey" FOREIGN KEY ("instantMeetingScheduleId") REFERENCES "Schedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventType" ADD CONSTRAINT "EventType_secondaryEmailId_fkey" FOREIGN KEY ("secondaryEmailId") REFERENCES "SecondaryEmail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventType" ADD CONSTRAINT "EventType_restrictionScheduleId_fkey" FOREIGN KEY ("restrictionScheduleId") REFERENCES "Schedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_delegationCredentialId_fkey" FOREIGN KEY ("delegationCredentialId") REFERENCES "DelegationCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestinationCalendar" ADD CONSTRAINT "DestinationCalendar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestinationCalendar" ADD CONSTRAINT "DestinationCalendar_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestinationCalendar" ADD CONSTRAINT "DestinationCalendar_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestinationCalendar" ADD CONSTRAINT "DestinationCalendar_delegationCredentialId_fkey" FOREIGN KEY ("delegationCredentialId") REFERENCES "DelegationCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPassword" ADD CONSTRAINT "UserPassword_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelSchedule" ADD CONSTRAINT "TravelSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_movedToProfileId_fkey" FOREIGN KEY ("movedToProfileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationsSubscriptions" ADD CONSTRAINT "NotificationsSubscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_createdByOAuthClientId_fkey" FOREIGN KEY ("createdByOAuthClientId") REFERENCES "PlatformOAuthClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditBalance" ADD CONSTRAINT "CreditBalance_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditBalance" ADD CONSTRAINT "CreditBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditPurchaseLog" ADD CONSTRAINT "CreditPurchaseLog_creditBalanceId_fkey" FOREIGN KEY ("creditBalanceId") REFERENCES "CreditBalance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditExpenseLog" ADD CONSTRAINT "CreditExpenseLog_creditBalanceId_fkey" FOREIGN KEY ("creditBalanceId") REFERENCES "CreditBalance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditExpenseLog" ADD CONSTRAINT "CreditExpenseLog_bookingUid_fkey" FOREIGN KEY ("bookingUid") REFERENCES "Booking"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationSettings" ADD CONSTRAINT "OrganizationSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_customRoleId_fkey" FOREIGN KEY ("customRoleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_secondaryEmailId_fkey" FOREIGN KEY ("secondaryEmailId") REFERENCES "SecondaryEmail"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstantMeetingToken" ADD CONSTRAINT "InstantMeetingToken_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstantMeetingToken" ADD CONSTRAINT "InstantMeetingToken_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingReference" ADD CONSTRAINT "BookingReference_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingReference" ADD CONSTRAINT "BookingReference_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingReference" ADD CONSTRAINT "BookingReference_delegationCredentialId_fkey" FOREIGN KEY ("delegationCredentialId") REFERENCES "DelegationCredential"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendee" ADD CONSTRAINT "Attendee_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_destinationCalendarId_fkey" FOREIGN KEY ("destinationCalendarId") REFERENCES "DestinationCalendar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_reassignById_fkey" FOREIGN KEY ("reassignById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tracking" ADD CONSTRAINT "Tracking_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectedCalendar" ADD CONSTRAINT "SelectedCalendar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectedCalendar" ADD CONSTRAINT "SelectedCalendar_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectedCalendar" ADD CONSTRAINT "SelectedCalendar_delegationCredentialId_fkey" FOREIGN KEY ("delegationCredentialId") REFERENCES "DelegationCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectedCalendar" ADD CONSTRAINT "SelectedCalendar_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTypeCustomInput" ADD CONSTRAINT "EventTypeCustomInput_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_platformOAuthClientId_fkey" FOREIGN KEY ("platformOAuthClientId") REFERENCES "PlatformOAuthClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateLimit" ADD CONSTRAINT "RateLimit_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HashedLink" ADD CONSTRAINT "HashedLink_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookScheduledTriggers" ADD CONSTRAINT "WebhookScheduledTriggers_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "Webhook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookScheduledTriggers" ADD CONSTRAINT "WebhookScheduledTriggers_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingSeat" ADD CONSTRAINT "BookingSeat_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingSeat" ADD CONSTRAINT "BookingSeat_attendeeId_fkey" FOREIGN KEY ("attendeeId") REFERENCES "Attendee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerifiedNumber" ADD CONSTRAINT "VerifiedNumber_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerifiedNumber" ADD CONSTRAINT "VerifiedNumber_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerifiedEmail" ADD CONSTRAINT "VerifiedEmail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerifiedEmail" ADD CONSTRAINT "VerifiedEmail_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFeatures" ADD CONSTRAINT "UserFeatures_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFeatures" ADD CONSTRAINT "UserFeatures_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamFeatures" ADD CONSTRAINT "TeamFeatures_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamFeatures" ADD CONSTRAINT "TeamFeatures_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthClient" ADD CONSTRAINT "OAuthClient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessCode" ADD CONSTRAINT "AccessCode_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "OAuthClient"("clientId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessCode" ADD CONSTRAINT "AccessCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessCode" ADD CONSTRAINT "AccessCode_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarCache" ADD CONSTRAINT "CalendarCache_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutOfOfficeEntry" ADD CONSTRAINT "OutOfOfficeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutOfOfficeEntry" ADD CONSTRAINT "OutOfOfficeEntry_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutOfOfficeEntry" ADD CONSTRAINT "OutOfOfficeEntry_reasonId_fkey" FOREIGN KEY ("reasonId") REFERENCES "OutOfOfficeReason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutOfOfficeReason" ADD CONSTRAINT "OutOfOfficeReason_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserHolidaySettings" ADD CONSTRAINT "UserHolidaySettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformOAuthClient" ADD CONSTRAINT "PlatformOAuthClient_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformAuthorizationToken" ADD CONSTRAINT "PlatformAuthorizationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformAuthorizationToken" ADD CONSTRAINT "PlatformAuthorizationToken_platformOAuthClientId_fkey" FOREIGN KEY ("platformOAuthClientId") REFERENCES "PlatformOAuthClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessToken" ADD CONSTRAINT "AccessToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessToken" ADD CONSTRAINT "AccessToken_platformOAuthClientId_fkey" FOREIGN KEY ("platformOAuthClientId") REFERENCES "PlatformOAuthClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_platformOAuthClientId_fkey" FOREIGN KEY ("platformOAuthClientId") REFERENCES "PlatformOAuthClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DSyncData" ADD CONSTRAINT "DSyncData_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "OrganizationSettings"("organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DSyncTeamGroupMapping" ADD CONSTRAINT "DSyncTeamGroupMapping_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DSyncTeamGroupMapping" ADD CONSTRAINT "DSyncTeamGroupMapping_directoryId_fkey" FOREIGN KEY ("directoryId") REFERENCES "DSyncData"("directoryId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecondaryEmail" ADD CONSTRAINT "SecondaryEmail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedOrganization" ADD CONSTRAINT "ManagedOrganization_managedOrganizationId_fkey" FOREIGN KEY ("managedOrganizationId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedOrganization" ADD CONSTRAINT "ManagedOrganization_managerOrganizationId_fkey" FOREIGN KEY ("managerOrganizationId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformBilling" ADD CONSTRAINT "PlatformBilling_managerBillingId_fkey" FOREIGN KEY ("managerBillingId") REFERENCES "PlatformBilling"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformBilling" ADD CONSTRAINT "PlatformBilling_id_fkey" FOREIGN KEY ("id") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributeOption" ADD CONSTRAINT "AttributeOption_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "Attribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attribute" ADD CONSTRAINT "Attribute_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributeToUser" ADD CONSTRAINT "AttributeToUser_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributeToUser" ADD CONSTRAINT "AttributeToUser_attributeOptionId_fkey" FOREIGN KEY ("attributeOptionId") REFERENCES "AttributeOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributeToUser" ADD CONSTRAINT "AttributeToUser_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributeToUser" ADD CONSTRAINT "AttributeToUser_createdByDSyncId_fkey" FOREIGN KEY ("createdByDSyncId") REFERENCES "DSyncData"("directoryId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributeToUser" ADD CONSTRAINT "AttributeToUser_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributeToUser" ADD CONSTRAINT "AttributeToUser_updatedByDSyncId_fkey" FOREIGN KEY ("updatedByDSyncId") REFERENCES "DSyncData"("directoryId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentReason" ADD CONSTRAINT "AssignmentReason_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelegationCredential" ADD CONSTRAINT "DelegationCredential_workspacePlatformId_fkey" FOREIGN KEY ("workspacePlatformId") REFERENCES "WorkspacePlatform"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelegationCredential" ADD CONSTRAINT "DelegationCredential_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTypeTranslation" ADD CONSTRAINT "EventTypeTranslation_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTypeTranslation" ADD CONSTRAINT "EventTypeTranslation_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTypeTranslation" ADD CONSTRAINT "EventTypeTranslation_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistAudit" ADD CONSTRAINT "WatchlistAudit_watchlistId_fkey" FOREIGN KEY ("watchlistId") REFERENCES "Watchlist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingReport" ADD CONSTRAINT "BookingReport_bookingUid_fkey" FOREIGN KEY ("bookingUid") REFERENCES "Booking"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingReport" ADD CONSTRAINT "BookingReport_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingReport" ADD CONSTRAINT "BookingReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingReport" ADD CONSTRAINT "BookingReport_watchlistId_fkey" FOREIGN KEY ("watchlistId") REFERENCES "Watchlist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingReport" ADD CONSTRAINT "BookingReport_globalWatchlistId_fkey" FOREIGN KEY ("globalWatchlistId") REFERENCES "Watchlist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WrongAssignmentReport" ADD CONSTRAINT "WrongAssignmentReport_bookingUid_fkey" FOREIGN KEY ("bookingUid") REFERENCES "Booking"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WrongAssignmentReport" ADD CONSTRAINT "WrongAssignmentReport_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WrongAssignmentReport" ADD CONSTRAINT "WrongAssignmentReport_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WrongAssignmentReport" ADD CONSTRAINT "WrongAssignmentReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationOnboarding" ADD CONSTRAINT "OrganizationOnboarding_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationOnboarding" ADD CONSTRAINT "OrganizationOnboarding_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalNotePreset" ADD CONSTRAINT "InternalNotePreset_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilterSegment" ADD CONSTRAINT "FilterSegment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilterSegment" ADD CONSTRAINT "FilterSegment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFilterSegmentPreference" ADD CONSTRAINT "UserFilterSegmentPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFilterSegmentPreference" ADD CONSTRAINT "UserFilterSegmentPreference_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "FilterSegment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingInternalNote" ADD CONSTRAINT "BookingInternalNote_notePresetId_fkey" FOREIGN KEY ("notePresetId") REFERENCES "InternalNotePreset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingInternalNote" ADD CONSTRAINT "BookingInternalNote_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingInternalNote" ADD CONSTRAINT "BookingInternalNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAudit" ADD CONSTRAINT "BookingAudit_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "AuditActor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalAiPhoneNumber" ADD CONSTRAINT "CalAiPhoneNumber_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalAiPhoneNumber" ADD CONSTRAINT "CalAiPhoneNumber_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalAiPhoneNumber" ADD CONSTRAINT "CalAiPhoneNumber_inboundAgentId_fkey" FOREIGN KEY ("inboundAgentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalAiPhoneNumber" ADD CONSTRAINT "CalAiPhoneNumber_outboundAgentId_fkey" FOREIGN KEY ("outboundAgentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamBilling" ADD CONSTRAINT "TeamBilling_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationBilling" ADD CONSTRAINT "OrganizationBilling_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatChangeLog" ADD CONSTRAINT "SeatChangeLog_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatChangeLog" ADD CONSTRAINT "SeatChangeLog_processedInProrationId_fkey" FOREIGN KEY ("processedInProrationId") REFERENCES "MonthlyProration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatChangeLog" ADD CONSTRAINT "SeatChangeLog_teamBillingId_fkey" FOREIGN KEY ("teamBillingId") REFERENCES "TeamBilling"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatChangeLog" ADD CONSTRAINT "SeatChangeLog_organizationBillingId_fkey" FOREIGN KEY ("organizationBillingId") REFERENCES "OrganizationBilling"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyProration" ADD CONSTRAINT "MonthlyProration_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyProration" ADD CONSTRAINT "MonthlyProration_teamBillingId_fkey" FOREIGN KEY ("teamBillingId") REFERENCES "TeamBilling"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyProration" ADD CONSTRAINT "MonthlyProration_organizationBillingId_fkey" FOREIGN KEY ("organizationBillingId") REFERENCES "OrganizationBilling"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarCacheEvent" ADD CONSTRAINT "CalendarCacheEvent_selectedCalendarId_fkey" FOREIGN KEY ("selectedCalendarId") REFERENCES "SelectedCalendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationAttributeSync" ADD CONSTRAINT "IntegrationAttributeSync_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationAttributeSync" ADD CONSTRAINT "IntegrationAttributeSync_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributeSyncRule" ADD CONSTRAINT "AttributeSyncRule_integrationAttributeSyncId_fkey" FOREIGN KEY ("integrationAttributeSyncId") REFERENCES "IntegrationAttributeSync"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributeSyncFieldMapping" ADD CONSTRAINT "AttributeSyncFieldMapping_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "Attribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributeSyncFieldMapping" ADD CONSTRAINT "AttributeSyncFieldMapping_integrationAttributeSyncId_fkey" FOREIGN KEY ("integrationAttributeSyncId") REFERENCES "IntegrationAttributeSync"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_user_eventtype" ADD CONSTRAINT "_user_eventtype_A_fkey" FOREIGN KEY ("A") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_user_eventtype" ADD CONSTRAINT "_user_eventtype_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PlatformOAuthClientToUser" ADD CONSTRAINT "_PlatformOAuthClientToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "PlatformOAuthClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PlatformOAuthClientToUser" ADD CONSTRAINT "_PlatformOAuthClientToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

