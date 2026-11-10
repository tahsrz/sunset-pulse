import { z } from 'zod';

const absoluteDateTimeSchema = z.string().datetime({ offset: true });

const timeZoneSchema = z.string().trim().min(1).max(80).refine((timeZone) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}, 'Use a valid IANA time zone.');

export const savedSellerIdentitySchema = z.object({
  leadId: z.string().guid(),
  funnelId: z.string().guid(),
  agentId: z.string().trim().min(1).max(120),
  site: z.string().trim().min(1).max(180),
}).strict();

export type SavedSellerIdentity = z.infer<typeof savedSellerIdentitySchema>;

const sellerAvailabilityWindowFields = z.object({
  from: absoluteDateTimeSchema,
  to: absoluteDateTimeSchema,
  timeZone: timeZoneSchema,
}).strict();

function validateSellerAvailabilityWindow(window: { from: string; to: string }, context: z.RefinementCtx) {
  const from = Date.parse(window.from);
  const to = Date.parse(window.to);
  if (to <= from) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['to'], message: 'The availability window must end after it starts.' });
  } else if (to - from > 14 * 24 * 60 * 60 * 1000) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['to'], message: 'Availability requests cannot exceed 14 days.' });
  }
}

export const sellerAvailabilityWindowSchema = sellerAvailabilityWindowFields.superRefine(validateSellerAvailabilityWindow);

export const sellerAvailabilityRequestSchema = sellerAvailabilityWindowFields.extend({
  identity: savedSellerIdentitySchema,
}).superRefine(validateSellerAvailabilityWindow);

export const sellerSlotSchema = z.object({
  id: z.string().trim().min(1).max(200),
  startsAt: absoluteDateTimeSchema,
  endsAt: absoluteDateTimeSchema,
  timeZone: timeZoneSchema,
}).strict().superRefine((slot, context) => {
  if (Date.parse(slot.endsAt) <= Date.parse(slot.startsAt)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['endsAt'], message: 'A slot must end after it starts.' });
  }
});

export type SellerSlot = z.infer<typeof sellerSlotSchema>;

export const sellerReservationRequestSchema = z.object({
  identity: savedSellerIdentitySchema,
  slotId: z.string().trim().min(1).max(200),
  requestId: z.string().guid(),
}).strict();

export const sellerReservationResultSchema = z.union([
  z.object({
    status: z.literal('confirmed'),
    bookingId: z.string().trim().min(1).max(200),
    startsAt: absoluteDateTimeSchema,
    endsAt: absoluteDateTimeSchema,
    timeZone: timeZoneSchema,
  }).strict().superRefine((booking, context) => {
    if (Date.parse(booking.endsAt) <= Date.parse(booking.startsAt)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['endsAt'], message: 'A booking must end after it starts.' });
    }
  }),
  z.object({ status: z.literal('conflict') }).strict(),
  z.object({ status: z.literal('cancelled') }).strict(),
  z.object({ status: z.literal('uncertain') }).strict(),
  z.object({ status: z.literal('unavailable'), reason: z.enum(['not_configured', 'provider_unavailable']) }).strict(),
]);

export type SellerReservationRequest = z.infer<typeof sellerReservationRequestSchema>;
export type SellerReservationResult = z.infer<typeof sellerReservationResultSchema>;
export const sellerAvailabilityResultSchema = z.union([
  z.object({ status: z.literal('available'), slots: z.array(sellerSlotSchema).max(500) }).strict(),
  z.object({ status: z.literal('unavailable'), reason: z.enum(['not_configured', 'provider_unavailable']) }).strict(),
]);

export type SellerAvailabilityRequest = z.infer<typeof sellerAvailabilityRequestSchema>;
export type SellerAvailabilityResult = z.infer<typeof sellerAvailabilityResultSchema>;

export const sellerBookingOfferSchema = z.object({
  token: z.string().min(16).max(4096), expiresAt: absoluteDateTimeSchema,
}).strict();
export type SellerBookingOffer = z.infer<typeof sellerBookingOfferSchema>;

const clockTime = z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/);
export const sellerCalendarSettingsSchema = z.object({
  requestId: z.string().guid(), expectedRevision: z.number().int().positive().nullable(),
  enabled: z.boolean(), timeZone: timeZoneSchema,
  durationMinutes: z.union([z.literal(15),z.literal(30),z.literal(45),z.literal(60)]),
  noticeMinutes: z.number().int().min(0).max(10080), horizonDays: z.number().int().min(1).max(60),
  internalCalendarAcknowledged: z.boolean(),
  windows: z.array(z.object({ weekday: z.number().int().min(0).max(6), start: clockTime, end: clockTime }).strict()).max(21),
}).strict().superRefine((settings, context) => {
  if (settings.enabled && (!settings.internalCalendarAcknowledged || !settings.windows.length)) {
    context.addIssue({ code: 'custom', message: 'Choose availability and confirm this calendar before enabling bookings.' });
  }
  const minutes = (value: string) => Number(value.slice(0,2))*60+Number(value.slice(3));
  settings.windows.forEach((window,index) => {
    if (minutes(window.end)-minutes(window.start)<settings.durationMinutes) context.addIssue({ code: 'custom', path: ['windows',index], message: 'A window must fit one consultation.' });
    if (settings.windows.some((other,i) => i<index && other.weekday===window.weekday && other.start<window.end && window.start<other.end)) {
      context.addIssue({ code: 'custom', path: ['windows',index], message: 'Availability windows must not overlap.' });
    }
  });
});
export type SellerCalendarSettings = z.infer<typeof sellerCalendarSettingsSchema>;

const sellerCalendarSite = z.object({agentId:z.string(),site:z.string()}).strict();
export const sellerCalendarReadSchema = z.object({
  sites:z.array(sellerCalendarSite).max(50), selected:sellerCalendarSite.nullable(),settings:sellerCalendarSettingsSchema.nullable(),
  bookings:z.array(z.object({id:z.string().guid(),lead_id:z.string().guid().nullable(),start_time:absoluteDateTimeSchema,end_time:absoluteDateTimeSchema,status:z.enum(['accepted','cancelled'])}).strict()).max(50),
}).strict();
export type SellerCalendarRead = z.infer<typeof sellerCalendarReadSchema>;
