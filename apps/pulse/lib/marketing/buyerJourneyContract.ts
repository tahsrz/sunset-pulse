import { z } from 'zod';
import { activeBuyerStageSchema, buyerPreferencesSchema } from './guidedJourneySchema';
import { sellerPlanLeadSchema } from './leadMagnetContract';

export const buyerJourneySchema = z.object({
  mode: z.literal('buy'),
  buyingStage: activeBuyerStageSchema,
  buyerPreferences: buyerPreferencesSchema.extend({
    preApproval: z.enum(['yes', 'no', 'unknown', 'skipped']),
  }),
}).strict();

export const buyerRequestSchema = sellerPlanLeadSchema.pick({
  submissionId: true, name: true, email: true, requestedContact: true,
  marketingOptIn: true, company: true, campaign: true,
}).extend({
  offerKey: z.literal('sunset-pulse-buyer-plan'),
  offerVersion: z.literal('1'),
  journey: buyerJourneySchema,
}).strict();

export type BuyerRequest = z.infer<typeof buyerRequestSchema>;
