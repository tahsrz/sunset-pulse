import { z } from 'zod';

export const PUBLIC_GUIDE_NEXT_STEP_IDS = [
  'discuss_listing',
  'refine_search',
  'schedule_tour',
  'selling_guidance',
  'general_question',
] as const;

export const PUBLIC_GUIDE_NEXT_STEPS = [
  { id: 'discuss_listing', label: 'Discuss this home' },
  { id: 'refine_search', label: 'Refine my search' },
  { id: 'schedule_tour', label: 'Plan a tour' },
  { id: 'selling_guidance', label: 'Talk about selling' },
  { id: 'general_question', label: 'Answer another question' },
] as const;

const handoffMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  text: z.string().trim().min(1).max(2000),
}).strict();

export const publicGuideHandoffInputSchema = z.object({
  conversation: z.array(handoffMessageSchema).min(1).max(12),
  discussedListingIds: z.array(z.string().trim().min(1).max(120)).max(8).default([]),
  nextStep: z.enum(PUBLIC_GUIDE_NEXT_STEP_IDS),
  sessionId: z.string().trim().min(8).max(160),
}).strict();

export const publicGuideSearchCriteriaSchema = z.object({
  locations: z.array(z.string().trim().min(1).max(80)).max(5).default([]),
  priceMin: z.number().finite().nonnegative().nullable().default(null),
  priceMax: z.number().finite().nonnegative().nullable().default(null),
  bedsMin: z.number().finite().nonnegative().nullable().default(null),
  bathsMin: z.number().finite().nonnegative().nullable().default(null),
  propertyTypes: z.array(z.string().trim().min(1).max(60)).max(5).default([]),
  priorities: z.array(z.string().trim().min(1).max(100)).max(6).default([]),
}).strict();

export const publicGuideHandoffBriefSchema = z.object({
  schemaVersion: z.literal(1),
  summary: z.string().trim().min(1).max(640),
  searchCriteria: publicGuideSearchCriteriaSchema,
  discussedListingIds: z.array(z.string().trim().min(1).max(120)).max(8),
  statedNextStep: z.enum(PUBLIC_GUIDE_NEXT_STEP_IDS),
  conversationTurnCount: z.number().int().min(1).max(12),
  generatedBy: z.enum(['model', 'deterministic']),
  transcriptStored: z.literal(false),
}).strict();

export type PublicGuideHandoffInput = z.infer<typeof publicGuideHandoffInputSchema>;
export type PublicGuideHandoffBrief = z.infer<typeof publicGuideHandoffBriefSchema>;
export type PublicGuideNextStep = z.infer<typeof publicGuideHandoffInputSchema>['nextStep'];
export type PublicGuideSearchCriteria = z.infer<typeof publicGuideSearchCriteriaSchema>;

export function getPublicGuideNextStepLabel(nextStep: PublicGuideNextStep) {
  return PUBLIC_GUIDE_NEXT_STEPS.find((candidate) => candidate.id === nextStep)?.label
    || 'Follow up with this visitor';
}
