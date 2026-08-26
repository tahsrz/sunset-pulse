import { z } from 'zod';

export const economicsScenarioSchema = z.object({
  name: z.enum(['low', 'normal', 'heavy']), revenueUsd: z.number().finite().nonnegative(), costUsd: z.number().finite().nonnegative().nullable(),
  duplicateRatePercent: z.number().finite().nonnegative(), disputeRatePercent: z.number().finite().nonnegative(), pipelineValueUsd: z.number().finite().nonnegative(), handoffConversionPercent: z.number().finite().nonnegative(), appointmentConversionPercent: z.number().finite().nonnegative(), billedDollars: z.number().finite().nonnegative(),
}).strict();

export function evaluateEconomicsScenario(input: z.input<typeof economicsScenarioSchema>) {
  const scenario = economicsScenarioSchema.parse(input);
  const marginPercent = scenario.costUsd === null || scenario.revenueUsd <= 0 ? null : ((scenario.revenueUsd - scenario.costUsd) / scenario.revenueUsd) * 100;
  return {
    name: scenario.name, marginPercent, costsKnown: scenario.costUsd !== null,
    pipelineMultiple: scenario.billedDollars > 0 ? scenario.pipelineValueUsd / scenario.billedDollars : null,
    targets: {
      grossMargin: marginPercent === null ? null : marginPercent >= 70,
      duplicates: scenario.duplicateRatePercent < 1,
      disputes: scenario.disputeRatePercent < 3,
      pipeline: scenario.billedDollars > 0 ? scenario.pipelineValueUsd / scenario.billedDollars >= 5 : null,
    },
    conversion: { handoffPercent: scenario.handoffConversionPercent, appointmentPercent: scenario.appointmentConversionPercent },
  };
}
