import { z } from 'zod';

export const pricingDecisionInputSchema = z.object({
  marginPercent: z.number().finite().nullable(), duplicateRatePercent: z.number().finite().nonnegative().nullable(), disputeRatePercent: z.number().finite().nonnegative().nullable(), pipelineMultiple: z.number().finite().nonnegative().nullable(), handoffConversionDeltaPercent: z.number().finite().nullable(), appointmentConversionDeltaPercent: z.number().finite().nullable(), evidenceDays: z.number().int().nonnegative(), legalApproved: z.boolean(), severeTrustFailure: z.boolean().default(false),
}).strict();

export type PricingDecision = 'launch' | 'revise_prices' | 'revise_definitions' | 'continue_shadow' | 'stop';

export function evaluatePricingDecision(input: z.input<typeof pricingDecisionInputSchema>) {
  const value = pricingDecisionInputSchema.parse(input);
  if (value.severeTrustFailure) return decision('stop', ['severe_trust_failure']);
  if (!value.legalApproved || value.evidenceDays < 14) return decision('continue_shadow', [!value.legalApproved ? 'legal_not_approved' : 'shadow_period_incomplete']);
  const metricsKnown = [value.marginPercent, value.duplicateRatePercent, value.disputeRatePercent, value.pipelineMultiple, value.handoffConversionDeltaPercent, value.appointmentConversionDeltaPercent].every((metric) => metric !== null);
  if (!metricsKnown) return decision('continue_shadow', ['incomplete_evidence']);
  if (value.duplicateRatePercent! >= 1 || value.disputeRatePercent! >= 3) return decision('revise_definitions', ['trust_rate_target_missed']);
  if (value.marginPercent! < 70 || value.pipelineMultiple! < 5) return decision('revise_prices', ['economics_target_missed']);
  if (value.handoffConversionDeltaPercent! < 0 || value.appointmentConversionDeltaPercent! < 0) return decision('continue_shadow', ['conversion_regression']);
  return decision('launch', ['all_launch_gates_passed']);
}

function decision(value: PricingDecision, reasons: string[]) { return { decision: value, reasons }; }
