import { z } from 'zod';

const campaignField = z.string().trim().max(100).nullable().optional();

export const sellerPlanLeadSchema = z.object({
  offerKey: z.literal('keller-westlake-seller-plan'),
  offerVersion: z.literal('1'),
  submissionId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  propertyAddress: z.string().trim().max(240).optional(),
  timing: z.enum(['exploring', 'within-30-days', 'one-to-three-months', 'three-to-six-months', 'later']),
  message: z.string().trim().max(1000).optional(),
  requestedContact: z.literal(true),
  marketingOptIn: z.boolean(),
  company: z.string().max(120).optional(),
  campaign: z.object({
    source: campaignField,
    medium: campaignField,
    campaign: campaignField,
    content: campaignField,
  }).strict().optional(),
}).strict();

export type SellerPlanLeadInput = z.infer<typeof sellerPlanLeadSchema>;

export function normalizeCampaign(campaign: SellerPlanLeadInput['campaign']) {
  if (!campaign) return undefined;
  const normalized = Object.fromEntries(
    Object.entries(campaign).flatMap(([key, value]) => {
      if (!value || value.length > 100 || /[\/@?&#=]/.test(value) || /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i.test(value) || /(?:\+?\d[\d ().-]{6,}\d)/.test(value)) return [];
      return [[key, value]];
    }),
  );
  return Object.keys(normalized).length ? normalized : undefined;
}
