import { z } from 'zod';
import { JsonValueSchema } from '../inputTypeSchemas/JsonValueSchema'
import { PeriodTypeSchema } from '../inputTypeSchemas/PeriodTypeSchema'
import { SchedulingTypeSchema } from '../inputTypeSchemas/SchedulingTypeSchema'
import { CancellationReasonRequirementSchema } from '../inputTypeSchemas/CancellationReasonRequirementSchema'
import { eventTypeSlug } from '../../zod-utils'
import { eventTypeLocations } from '../../zod-utils'
import { eventTypeBookingFields } from '../../zod-utils'
import { coerceToDate } from '../../zod-utils'
import { recurringEventType } from '../../zod-utils'
import { EventTypeMetaDataSchema } from '../../zod-utils'
import { successRedirectUrl } from '../../zod-utils'
import { intervalLimitsType } from '../../zod-utils'
import { rrSegmentQueryValueSchema } from '../../zod-utils'
import { emailSchema } from '../../zod-utils'
import { eventTypeColor } from '../../zod-utils'

/////////////////////////////////////////
// EVENT TYPE SCHEMA
/////////////////////////////////////////

export const EventTypeSchema = z.object({
  periodType: PeriodTypeSchema,
  schedulingType: SchedulingTypeSchema.nullable(),
  requiresCancellationReason: CancellationReasonRequirementSchema.nullable(),
  id: z.number().int(),
  title: z.string().min(1),
  slug: eventTypeSlug,
  description: z.string().nullable(),
  interfaceLanguage: z.string().nullable(),
  position: z.number().int(),
  locations: eventTypeLocations.nullable(),
  length: z.number().min(1),
  offsetStart: z.number().int(),
  hidden: z.boolean(),
  userId: z.number().int().nullable(),
  profileId: z.number().int().nullable(),
  teamId: z.number().int().nullable(),
  useEventLevelSelectedCalendars: z.boolean(),
  eventName: z.string().nullable(),
  parentId: z.number().int().nullable(),
  bookingFields: eventTypeBookingFields.nullable(),
  timeZone: z.string().nullable(),
  periodStartDate: coerceToDate.nullable(),
  periodEndDate: coerceToDate.nullable(),
  periodDays: z.number().int().nullable(),
  periodCountCalendarDays: z.boolean().nullable(),
  lockTimeZoneToggleOnBookingPage: z.boolean(),
  lockedTimeZone: z.string().nullable(),
  requiresConfirmation: z.boolean(),
  requiresConfirmationWillBlockSlot: z.boolean(),
  requiresConfirmationForFreeEmail: z.boolean(),
  requiresBookerEmailVerification: z.boolean(),
  canSendCalVideoTranscriptionEmails: z.boolean(),
  autoTranslateDescriptionEnabled: z.boolean(),
  autoTranslateInstantMeetingTitleEnabled: z.boolean(),
  recurringEvent: recurringEventType.nullable(),
  disableGuests: z.boolean(),
  hideCalendarNotes: z.boolean(),
  hideCalendarEventDetails: z.boolean(),
  minimumBookingNotice: z.number().min(0),
  beforeEventBuffer: z.number().int(),
  afterEventBuffer: z.number().int(),
  seatsPerTimeSlot: z.number().int().nullable(),
  onlyShowFirstAvailableSlot: z.boolean(),
  showOptimizedSlots: z.boolean().nullable(),
  disableCancelling: z.boolean().nullable(),
  disableRescheduling: z.boolean().nullable(),
  minimumRescheduleNotice: z.number().min(0).nullable(),
  seatsShowAttendees: z.boolean().nullable(),
  seatsShowAvailabilityCount: z.boolean().nullable(),
  scheduleId: z.number().int().nullable(),
  allowReschedulingCancelledBookings: z.boolean().nullable(),
  price: z.number().int(),
  currency: z.string(),
  slotInterval: z.number().int().nullable(),
  metadata: EventTypeMetaDataSchema.nullable(),
  successRedirectUrl: successRedirectUrl.nullable(),
  forwardParamsSuccessRedirect: z.boolean().nullable(),
  bookingLimits: intervalLimitsType.nullable(),
  durationLimits: intervalLimitsType.nullable(),
  isInstantEvent: z.boolean(),
  instantMeetingExpiryTimeOffsetInSeconds: z.number().int(),
  instantMeetingScheduleId: z.number().int().nullable(),
  instantMeetingParameters: z.string().array(),
  assignAllTeamMembers: z.boolean(),
  assignRRMembersUsingSegment: z.boolean(),
  rrSegmentQueryValue: rrSegmentQueryValueSchema.nullable(),
  useEventTypeDestinationCalendarEmail: z.boolean(),
  isRRWeightsEnabled: z.boolean(),
  maxLeadThreshold: z.number().int().nullable(),
  includeNoShowInRRCalculation: z.boolean(),
  allowReschedulingPastBookings: z.boolean(),
  hideOrganizerEmail: z.boolean(),
  maxActiveBookingsPerBooker: z.number().int().nullable(),
  maxActiveBookingPerBookerOfferReschedule: z.boolean(),
  customReplyToEmail: emailSchema.nullable(),
  eventTypeColor: eventTypeColor.nullable(),
  rescheduleWithSameRoundRobinHost: z.boolean(),
  secondaryEmailId: z.number().int().nullable(),
  useBookerTimezone: z.boolean(),
  restrictionScheduleId: z.number().int().nullable(),
  bookingRequiresAuthentication: z.boolean(),
  rrHostSubsetEnabled: z.boolean(),
  enablePerHostLocations: z.boolean(),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
})

export type EventType = z.infer<typeof EventTypeSchema>

export default EventTypeSchema;
