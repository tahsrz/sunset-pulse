import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';

export const internalCostEntrySchema = z.object({
  tenantSite: z.string().trim().min(1).max(180),
  funnelId: z.string().uuid().nullable().default(null),
  leadId: z.string().uuid().nullable().default(null),
  costType: z.enum(['model', 'search_tool', 'email_sms', 'signing', 'crawling', 'infrastructure']),
  amountUsd: z.number().finite().nonnegative().nullable().default(null),
  occurredAt: z.string().datetime(),
  source: z.string().trim().min(1).max(180),
  evidence: z.record(z.unknown()).default({}),
  idempotencyKey: z.string().trim().min(16).max(220),
}).strict();

export type InternalCostEntry = z.infer<typeof internalCostEntrySchema> & { currency: 'USD' };
export type InternalCostSummary = Awaited<ReturnType<typeof loadInternalCostSummary>>;

export function buildInternalCostEntry(input: z.input<typeof internalCostEntrySchema>): InternalCostEntry {
  return { ...internalCostEntrySchema.parse(input), currency: 'USD' };
}

export async function persistInternalCost(input: z.input<typeof internalCostEntrySchema>) {
  const entry = buildInternalCostEntry(input);
  const { data: existing, error: readError } = await supabaseAdmin
    .from('internal_cost_entries').select('*').eq('idempotency_key', entry.idempotencyKey).maybeSingle();
  if (readError) throw new Error(`Unable to read internal cost: ${readError.message}`);
  if (existing) return { entry: existing, duplicate: true };
  const { data, error } = await supabaseAdmin.from('internal_cost_entries').insert({
    tenant_site: entry.tenantSite, funnel_id: entry.funnelId, lead_id: entry.leadId,
    cost_type: entry.costType, amount_usd: entry.amountUsd, currency: entry.currency,
    occurred_at: entry.occurredAt, source: entry.source, evidence: entry.evidence,
    idempotency_key: entry.idempotencyKey,
  }).select('*').single();
  if (error) throw new Error(`Unable to persist internal cost: ${error.message}`);
  return { entry: data, duplicate: false };
}

export async function loadInternalCostSummary(now = new Date(), windowDays = 7) {
  const since = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin.from('internal_cost_entries')
    .select('amount_usd, cost_type').gte('occurred_at', since).eq('status', 'recorded').limit(10000);
  if (error) throw new Error(`Unable to load internal cost summary: ${error.message}`);
  const rows = (data || []) as Array<{ amount_usd: number | string | null; cost_type: string }>;
  const known = rows.filter((row) => row.amount_usd !== null).map((row) => Number(row.amount_usd));
  const total = rows.length === known.length ? known.reduce((sum, value) => sum + value, 0) : null;
  const byType = Object.fromEntries([...new Set(rows.map((row) => row.cost_type))].map((type) => {
    const values = rows.filter((row) => row.cost_type === type).map((row) => row.amount_usd === null ? null : Number(row.amount_usd));
    return [type, values.every((value) => value !== null) ? values.reduce((sum, value) => sum + (value || 0), 0) : null];
  }));
  return { windowDays, entries: rows.length, knownEntries: known.length, totalUsd: total, byType, costsKnown: rows.length === known.length };
}
