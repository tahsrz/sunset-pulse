import { z } from 'zod';
import { evaluatePricingDecision } from '@/lib/profit/pricingDecision';
import { supabaseAdmin } from '@/lib/supabase';

const checkpointSchema = z.object({
  date: z.string().date(), marginPercent: z.number().finite().nullable(), duplicateRatePercent: z.number().finite().nonnegative().nullable(), disputeRatePercent: z.number().finite().nonnegative().nullable(), pipelineMultiple: z.number().finite().nonnegative().nullable(), handoffConversionDeltaPercent: z.number().finite().nullable(), appointmentConversionDeltaPercent: z.number().finite().nullable(),
}).strict();

export function aggregateShadowCheckpoints(input: { checkpoints: Array<z.input<typeof checkpointSchema>>; legalApproved: boolean }) {
  const checkpoints = input.checkpoints.map((checkpoint) => checkpointSchema.parse(checkpoint));
  const average = (key: keyof Omit<typeof checkpoints[number], 'date'>) => {
    const values = checkpoints.map((checkpoint) => checkpoint[key]).filter((value): value is number => value !== null);
    return values.length === checkpoints.length && values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  };
  const decision = evaluatePricingDecision({ marginPercent: average('marginPercent'), duplicateRatePercent: average('duplicateRatePercent'), disputeRatePercent: average('disputeRatePercent'), pipelineMultiple: average('pipelineMultiple'), handoffConversionDeltaPercent: average('handoffConversionDeltaPercent'), appointmentConversionDeltaPercent: average('appointmentConversionDeltaPercent'), evidenceDays: checkpoints.length, legalApproved: input.legalApproved });
  const averages = { marginPercent: average('marginPercent'), duplicateRatePercent: average('duplicateRatePercent'), disputeRatePercent: average('disputeRatePercent'), pipelineMultiple: average('pipelineMultiple'), handoffConversionDeltaPercent: average('handoffConversionDeltaPercent'), appointmentConversionDeltaPercent: average('appointmentConversionDeltaPercent') };
  const unknownMetrics = Object.entries(averages).filter(([, value]) => value === null).map(([key]) => key);
  return { evidenceDays: checkpoints.length, complete: checkpoints.length >= 14 && checkpoints.every((checkpoint) => Object.values(checkpoint).every((value) => value !== null)), unknownMetricCount: unknownMetrics.length, unknownMetrics, averages, decision };
}

export async function persistShadowCheckpoint(input: { tenantSite: string; checkpoint: z.input<typeof checkpointSchema>; evidence?: Record<string, unknown> }) {
  const checkpoint = checkpointSchema.parse(input.checkpoint);
  const { data, error } = await supabaseAdmin.from('shadow_economics_checkpoints').upsert({
    tenant_site: input.tenantSite, checkpoint_date: checkpoint.date, margin_percent: checkpoint.marginPercent,
    duplicate_rate_percent: checkpoint.duplicateRatePercent, dispute_rate_percent: checkpoint.disputeRatePercent,
    pipeline_multiple: checkpoint.pipelineMultiple, handoff_conversion_delta_percent: checkpoint.handoffConversionDeltaPercent,
    appointment_conversion_delta_percent: checkpoint.appointmentConversionDeltaPercent, evidence: input.evidence || {}, updated_at: new Date().toISOString(),
  }, { onConflict: 'tenant_site,checkpoint_date' }).select('*').single();
  if (error) throw new Error(`Unable to persist shadow checkpoint: ${error.message}`);
  return data;
}

export async function loadShadowCheckpointDecision(input: { tenantSite: string; legalApproved: boolean }) {
  const { data, error } = await supabaseAdmin.from('shadow_economics_checkpoints')
    .select('checkpoint_date, margin_percent, duplicate_rate_percent, dispute_rate_percent, pipeline_multiple, handoff_conversion_delta_percent, appointment_conversion_delta_percent')
    .eq('tenant_site', input.tenantSite).order('checkpoint_date', { ascending: true }).limit(31);
  if (error) throw new Error(`Unable to load shadow checkpoints: ${error.message}`);
  const checkpoints = (data || []).map((row) => ({ date: row.checkpoint_date, marginPercent: row.margin_percent === null ? null : Number(row.margin_percent), duplicateRatePercent: row.duplicate_rate_percent === null ? null : Number(row.duplicate_rate_percent), disputeRatePercent: row.dispute_rate_percent === null ? null : Number(row.dispute_rate_percent), pipelineMultiple: row.pipeline_multiple === null ? null : Number(row.pipeline_multiple), handoffConversionDeltaPercent: row.handoff_conversion_delta_percent === null ? null : Number(row.handoff_conversion_delta_percent), appointmentConversionDeltaPercent: row.appointment_conversion_delta_percent === null ? null : Number(row.appointment_conversion_delta_percent) }));
  return aggregateShadowCheckpoints({ checkpoints, legalApproved: input.legalApproved });
}
