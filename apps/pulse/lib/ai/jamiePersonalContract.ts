import { z } from 'zod';
import { plannerItemInputSchema, realtorDateSchema } from '@/lib/realtor-workspace/contracts';

export const chatContextSchema = z.enum(['general', 'personal_realtor']);

const boundedRecord = z.record(z.string(), z.unknown()).refine((value) => JSON.stringify(value).length <= 12_000);
const proposalBase = {
  proposalId: z.string().uuid(),
  editableFields: boundedRecord,
  missingFields: z.array(z.string().trim().min(1).max(120)).max(20),
  targetRevision: z.number().int().positive().nullable(),
  confirmation: z.string().trim().min(1).max(500),
};

const localDate = realtorDateSchema;
const plannerItemDraftSchema = z.custom<Record<string, unknown>>((value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value) || 'requestKey' in value) return false;
  const parsed = plannerItemInputSchema.safeParse({ ...value, requestKey: '11111111-1111-4111-8111-111111111111' });
  return parsed.success && !parsed.data.sellerLead && !parsed.data.sourceSprintTaskId;
});
const plannerApiPayloadSchema = z.object({
  itemId: z.string().uuid().nullable(),
  expectedRevision: z.number().int().positive().nullable(),
  item: plannerItemDraftSchema,
}).strict().refine((value) => value.itemId === null && value.expectedRevision === null);
const financialApiPayloadSchema = z.union([
  z.object({ mode: z.literal('gross'), grossCents: z.number().int().positive(), deductions: z.array(z.object({ kind: z.enum(['broker_split','transaction_fee','other_withheld']), label: z.string().min(1).max(120), amountCents: z.number().int().positive() }).strict()).max(20), receivedDate: localDate, closingReference: z.string().max(120).nullable(), property: z.object({ propertyId: z.string().uuid() }).strict().nullable(), memo: z.string().max(1000) }).strict(),
  z.object({ mode: z.literal('net_deposit'), depositCents: z.number().int().positive(), receivedDate: localDate, closingReference: z.string().max(120).nullable(), property: z.object({ propertyId: z.string().uuid() }).strict().nullable(), memo: z.string().max(1000) }).strict(),
  z.object({ amountCents: z.number().int().positive(), paidDate: localDate, category: z.enum(['broker_dues','mls','association','education','license','insurance','marketing','software','other']), payee: z.string().max(160), note: z.string().max(1000), occurrenceId: z.string().uuid().nullable() }).strict(),
  z.object({ estimatedTakeHomeCents: z.number().int().positive(), expectedDate: localDate, label: z.string().min(1).max(160), property: z.object({ propertyId: z.string().uuid() }).strict().nullable() }).strict(),
]);
const goalApiPayloadSchema = z.object({
  id: z.string().uuid().nullable(), metric: z.enum(['net_income','closings','weekly_reviews']),
  year: z.number().int().min(2000).max(2200), target: z.number().int().positive(),
  expectedRevision: z.number().int().positive().nullable(),
}).strict();

export const jamiePersonalProposalSchema = z.discriminatedUnion('kind', [
  z.object({ ...proposalBase, kind: z.literal('planner_proposal'), preview: z.object({ nextThreeDueDates: z.array(localDate).max(3), timeZone: z.string().min(1).max(80) }).strict().nullable(), apiPayload: plannerApiPayloadSchema.nullable(), intendedApiAction: z.literal('POST /api/realtor/planner') }).strict(),
  z.object({ ...proposalBase, kind: z.literal('financial_proposal'), preview: z.object({ explanation: z.string().max(500), amountCents: z.number().int().positive().nullable(), date: localDate.nullable() }).strict().nullable(), apiPayload: financialApiPayloadSchema.nullable(), intendedApiAction: z.literal('POST /api/realtor/financial-records') }).strict(),
  z.object({ ...proposalBase, kind: z.literal('goal_proposal'), preview: z.object({ note: z.string().max(500) }).strict().nullable(), apiPayload: goalApiPayloadSchema.nullable(), intendedApiAction: z.literal('POST /api/realtor/goals') }).strict(),
]);

export const jamiePersonalResponseSchema = z.object({
  role: z.literal('assistant'),
  content: z.string().max(8_000),
  personal: z.object({
    context: z.literal('personal_realtor'),
    proposals: z.array(jamiePersonalProposalSchema).max(3),
    availability: z.object({ agenda: z.boolean(), business: z.boolean(), seller: z.boolean() }).strict(),
    links: z.object({ today: z.literal('/today'), planner: z.literal('/planner'), business: z.literal('/business'), inbox: z.literal('/admin/agent-leads') }).strict(),
  }).strict(),
}).strict();

export type JamiePersonalProposal = z.infer<typeof jamiePersonalProposalSchema>;
export type JamiePersonalResponse = z.infer<typeof jamiePersonalResponseSchema>;

export const personalProposalEndpoint: Record<JamiePersonalProposal['kind'], string> = {
  planner_proposal: '/api/realtor/planner',
  financial_proposal: '/api/realtor/financial-records',
  goal_proposal: '/api/realtor/goals',
};
