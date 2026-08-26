import { z } from 'zod';

const inputSchema = z.object({ cohort: z.enum(['internal', 'friendly_agent', 'three_agent', 'ten_agent', 'general']), legalApproved: z.boolean(), pricingDecision: z.literal('launch'), evidenceDays: z.number().int().nonnegative(), trustBlocker: z.boolean(), reconciliationGap: z.boolean() }).strict();
const minimumDays: Record<z.infer<typeof inputSchema>['cohort'], number> = { internal: 14, friendly_agent: 21, three_agent: 28, ten_agent: 42, general: 56 };

export function evaluateLaunchGate(input: z.input<typeof inputSchema>) {
  const value = inputSchema.parse(input);
  const blockers = [!value.legalApproved ? 'legal_not_approved' : null, value.evidenceDays < minimumDays[value.cohort] ? 'cohort_evidence_incomplete' : null, value.trustBlocker ? 'trust_blocker' : null, value.reconciliationGap ? 'reconciliation_gap' : null].filter((reason): reason is string => Boolean(reason));
  return { cohort: value.cohort, eligible: blockers.length === 0, blockers };
}
