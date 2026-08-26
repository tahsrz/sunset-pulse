import { z } from 'zod';

const rateSchema = z.number().finite().nonnegative();
export const conversionBaselineSchema = z.object({ handoffPercent: rateSchema, appointmentPercent: rateSchema }).strict();
export const conversionObservationSchema = z.object({ handoffPercent: rateSchema, appointmentPercent: rateSchema }).strict();
export type ConversionBaseline = z.infer<typeof conversionBaselineSchema>;

export function calculateConversionDeltas(input: { baseline: z.input<typeof conversionBaselineSchema>; observed: z.input<typeof conversionObservationSchema> }) {
  const baseline = conversionBaselineSchema.parse(input.baseline);
  const observed = conversionObservationSchema.parse(input.observed);
  return {
    handoffConversionDeltaPercent: observed.handoffPercent - baseline.handoffPercent,
    appointmentConversionDeltaPercent: observed.appointmentPercent - baseline.appointmentPercent,
  };
}
