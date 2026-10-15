import { z } from 'zod';
import { realtorDateSchema } from './contracts';

export const sellerMilestones = [
  'consultation_held', 'listing_agreement_verified', 'preparing', 'published',
  'showing', 'offer_received', 'under_contract', 'closed',
] as const;
export const sellerMilestoneLabels: Record<typeof sellerMilestones[number], string> = {
  consultation_held: 'Consultation held', listing_agreement_verified: 'Listing agreement verified',
  preparing: 'Preparing the property', published: 'Listing published', showing: 'Showings underway',
  offer_received: 'Offer received', under_contract: 'Under contract', closed: 'Closed',
};
const uuid = z.string().uuid();
const text = z.string().trim().min(1);
const identity = { leadId: uuid, expectedRevision: z.number().int().positive(), requestKey: uuid };
export const sellerDocumentSchema = z.object({
  label: text.max(120), url: z.string().url().max(2000).refine((value) => {
    const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password;
  }, 'Use a reviewed HTTPS document link.'),
}).strict();
export const sellerChecklistSchema = z.object({ id: uuid, title: text.max(160), done: z.boolean() }).strict();
export const sellerPublicationSchema = z.object({
  summary: z.string().trim().max(2000),
  milestones: z.array(z.enum(sellerMilestones)).max(8).refine((items) => new Set(items).size === items.length),
  checklist: z.array(sellerChecklistSchema).max(30),
  documents: z.array(sellerDocumentSchema).max(20),
}).strict();
export const sellerServiceActionSchema = z.discriminatedUnion('action', [
  z.object({ ...identity, action: z.literal('save_case'), propertyId: uuid.nullable(),
    notes: z.string().max(4000), documents: z.array(sellerDocumentSchema).max(20),
    checklist: z.array(sellerChecklistSchema).max(30) }).strict(),
  z.object({ ...identity, action: z.literal('milestone'), milestone: z.enum(sellerMilestones),
    occurredOn: realtorDateSchema, evidence: text.max(1000) }).strict(),
  z.object({...identity,action:z.literal('retract_milestone'),eventId:uuid,reason:text.max(1000)}).strict(),
  z.object({ ...identity, action: z.literal('link_booking'), bookingId: uuid }).strict(),
  z.object({ ...identity, action: z.literal('publish_progress'), reviewed: z.literal(true),
    publication: sellerPublicationSchema }).strict(),
  z.object({ ...identity, action: z.literal('share_progress'), enabled: z.boolean() }).strict(),
  z.object({ ...identity, action: z.literal('record_message'), direction: z.enum(['inbound', 'outbound']),
    subject: text.max(200), body: text.max(8000), occurredAt: z.string().datetime({ offset: true }) }).strict(),
  z.object({ ...identity, action: z.literal('send_email'), reviewed: z.literal(true),
    expectedLeadRevision: z.number().int().positive(), subject: text.max(200).refine((value) => !/[\r\n]/.test(value)),
    body: text.max(8000) }).strict(),
]);
export type SellerServiceAction = z.infer<typeof sellerServiceActionSchema>;
export const sellerCaseSchema = z.object({
  lead_id: uuid, owner_id: uuid, revision: z.number().int().positive(), property_id: uuid.nullable(),
  notes: z.string(), documents: z.array(sellerDocumentSchema), checklist: z.array(sellerChecklistSchema),
  publication: sellerPublicationSchema.nullable(), published_at: z.string().nullable(),
  sharing_enabled: z.boolean(), created_at: z.string(), updated_at: z.string(),
});
export const sellerCaseEventSchema = z.object({
  id: uuid, kind: z.string(), occurred_at: z.string(), details: z.record(z.unknown()),
});
export const sellerMessageSchema = z.object({
  id: uuid, direction: z.enum(['inbound', 'outbound']), subject: z.string(), body: z.string(),
  status: z.enum(['recorded', 'queued', 'sending', 'accepted', 'delivered', 'bounced', 'failed', 'unknown', 'cancelled']),
  occurred_at: z.string(), provider_id: z.string().nullable(),
});
export const sellerCaseResultSchema = z.object({
  case: sellerCaseSchema.nullable(), lead: z.object({ id: uuid, name: z.string(), email: z.string().nullable(), revision: z.number().int(), status: z.string().nullable() }),
  milestones:z.array(z.enum(sellerMilestones)).max(8),contactAllowed:z.boolean(),
  milestoneRecords:z.array(z.object({eventId:uuid,milestone:z.enum(sellerMilestones),evidence:z.string(),occurredOn:realtorDateSchema})).max(8),
  events: z.array(sellerCaseEventSchema).max(100), messages: z.array(sellerMessageSchema).max(100),
  hasMoreEvents: z.boolean(), hasMoreMessages: z.boolean(),
  bookings: z.array(z.object({ id: uuid, start_time: z.string(), end_time: z.string(), status: z.string(), linked: z.boolean() })).max(50),
  timeZone: z.string(), emailEnabled: z.boolean().optional(),emailFrom:z.string().nullable().optional(),
});
export type SellerCaseResult = z.infer<typeof sellerCaseResultSchema>;
