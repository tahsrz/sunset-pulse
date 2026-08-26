import { supabaseAdmin } from '@/lib/supabase';

export type ShadowQualityRow = { idempotencyKey: string; billingStatus: string; entryKind: string };

export function summarizeShadowQuality(rows: ShadowQualityRow[]) {
  const chargeRows = rows.filter((row) => row.entryKind === 'charge' && row.billingStatus !== 'voided');
  const uniqueKeys = new Set(chargeRows.map((row) => row.idempotencyKey));
  const duplicateRatePercent = chargeRows.length ? ((chargeRows.length - uniqueKeys.size) / chargeRows.length) * 100 : null;
  const outcomeRows = rows.filter((row) => row.entryKind === 'charge');
  const disputeRatePercent = outcomeRows.length ? (outcomeRows.filter((row) => row.billingStatus === 'disputed').length / outcomeRows.length) * 100 : null;
  return { duplicateRatePercent, disputeRatePercent, observedRows: rows.length };
}

export async function loadShadowQuality(input: { tenantSite: string; periodStart: string; periodEnd: string }) {
  const { data, error } = await supabaseAdmin.from('billable_outcomes')
    .select('idempotency_key, billing_status, entry_kind')
    .eq('tenant_site', input.tenantSite)
    .gte('occurred_at', input.periodStart)
    .lt('occurred_at', input.periodEnd);
  if (error) throw new Error(`Unable to load shadow quality: ${error.message}`);
  return summarizeShadowQuality((data || []).map((row) => ({ idempotencyKey: row.idempotency_key, billingStatus: row.billing_status, entryKind: row.entry_kind })));
}
