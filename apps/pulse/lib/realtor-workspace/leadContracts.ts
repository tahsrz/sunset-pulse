import { z } from 'zod';
import { realtorDateSchema } from './contracts';

const identity = {
  leadId: z.string().uuid(),
  expectedRevision: z.number().int().positive().safe(),
  requestKey: z.string().uuid(),
};
const occurredAt = z.string().datetime({ offset: true });

export const sellerLeadActionSchema = z.discriminatedUnion('action', [
  z.object({ ...identity, action: z.literal('record_contact'), channel: z.literal('email'), occurredAt }).strict(),
  z.object({ ...identity, action: z.literal('record_response'), source: z.literal('customer_reply'), occurredAt }).strict(),
  z.object({
    ...identity, action: z.literal('confirm_consultation'), startsAt: occurredAt,
    confirmationBasis: z.enum(['customer_reply', 'confirmed_booking']),
  }).strict(),
  z.object({ ...identity, action: z.literal('cancel_consultation'), consultationEventId: z.string().uuid() }).strict(),
  z.object({
    ...identity, action: z.literal('record_closing'), closedOn: realtorDateSchema,
    reference: z.string().trim().min(1).max(120),
  }).strict(),
  z.object({
    ...identity, action: z.literal('void_outcome'), outcomeEventId: z.string().uuid(),
    reason: z.string().trim().min(1).max(200),
  }).strict(),
  z.object({ ...identity, action: z.literal('revoke_requested_contact') }).strict(),
]);

export const sellerLeadPageSchema = z.object({
  // Fetch one extra row to determine whether a continuation cursor is needed.
  limit: z.coerce.number().int().min(1).max(50).default(25),
  cursor: z.string().max(512).optional(),
  leadId: z.string().uuid().optional(),
}).strict();

export type SellerLeadAction = z.infer<typeof sellerLeadActionSchema>;

export const ownedSellerLeadSchema = z.object({
  id: z.string().uuid(), revision: z.number().int().positive(), source: z.literal('seller_plan'),
  created_at: occurredAt, agent_id: z.string(), site: z.string(), name: z.string(),
  email: z.string(), message: z.string(), metadata: z.record(z.unknown()).nullable(),
  status: z.enum(['new', 'reviewed', 'contacted', 'touring', 'nurture', 'closed', 'archived']).nullable(),
  contact_attempted_at: occurredAt.nullable(), responded_at: occurredAt.nullable(),
  sellerOutcomeEvents: z.array(z.object({
    id: z.string().uuid(), event_type: z.string(), occurred_at: occurredAt,
    lead_revision: z.number().int().positive(), details: z.record(z.unknown()),
  })).max(20),
});
export const ownedSellerLeadPageSchema = z.object({
  leads: z.array(ownedSellerLeadSchema).max(50), nextCursor: z.string().max(512).nullable(),
});
export type OwnedSellerLead = z.infer<typeof ownedSellerLeadSchema>;

export const sellerOutcomePageSchema = z.object({
  leadId: z.string().uuid(),
  kind: z.enum(['consultation', 'closing']),
  limit: z.coerce.number().int().min(1).max(50).default(25),
  cursor: z.string().min(1).max(512).optional(),
}).strict();

export const sellerOutcomePageResultSchema = z.object({
  events: z.array(z.object({
    id: z.string().uuid(),
    event_type: z.enum(['consultation_confirmed', 'closing_recorded']),
    lead_revision: z.number().int().positive(),
    occurred_at: occurredAt,
    created_at: occurredAt,
    details: z.record(z.unknown()),
  }).strict()).max(50),
  nextCursor: z.string().min(1).max(512).nullable(),
}).strict();

export type SellerOutcomeKind = z.infer<typeof sellerOutcomePageSchema>['kind'];
export type SellerOutcomePage = z.infer<typeof sellerOutcomePageResultSchema>;

export const sellerScheduleQuerySchema = z.object({
  leadId: z.string().uuid(),
  actionKey: z.union([z.literal('initial-response:v1'), z.string().regex(
    /^(reply|consultation):[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
  )]),
}).strict();

export const sellerScheduleResultSchema = z.object({
  itemId: z.string().uuid(), title: z.string(), itemStatus: z.enum(['active', 'archived']),
  effectiveDate: realtorDateSchema.nullable(),
  occurrenceStatus: z.enum(['pending', 'completed', 'skipped', 'cancelled']).nullable(),
}).strict().nullable();
export type SellerSavedSchedule = NonNullable<z.infer<typeof sellerScheduleResultSchema>>;
