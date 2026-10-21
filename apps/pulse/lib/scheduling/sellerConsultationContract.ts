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
  leadId: z.string().uuid(),
  funnelId: z.string().uuid(),
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
  requestId: z.string().uuid(),
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
