import { conversionBaselineSchema, type ConversionBaseline } from '@/lib/profit/conversionBaseline';
import { supabaseAdmin } from '@/lib/supabase';

export type StoredConversionBaseline = ConversionBaseline & { tenantSite: string; windowStart: string; windowEnd: string };

export async function persistConversionBaseline(input: StoredConversionBaseline) {
  const baseline = conversionBaselineSchema.parse(input);
  const { data, error } = await supabaseAdmin.from('shadow_conversion_baselines').upsert({
    tenant_site: input.tenantSite,
    window_start: input.windowStart,
    window_end: input.windowEnd,
    handoff_percent: baseline.handoffPercent,
    appointment_percent: baseline.appointmentPercent,
  }, { onConflict: 'tenant_site' }).select('*').single();
  if (error) throw new Error(`Unable to persist conversion baseline: ${error.message}`);
  return data;
}

export async function loadConversionBaseline(tenantSite: string): Promise<StoredConversionBaseline | null> {
  const { data, error } = await supabaseAdmin.from('shadow_conversion_baselines').select('tenant_site, window_start, window_end, handoff_percent, appointment_percent').eq('tenant_site', tenantSite).maybeSingle();
  if (error) throw new Error(`Unable to load conversion baseline: ${error.message}`);
  return data ? { tenantSite: data.tenant_site, windowStart: data.window_start, windowEnd: data.window_end, handoffPercent: Number(data.handoff_percent), appointmentPercent: Number(data.appointment_percent) } : null;
}
