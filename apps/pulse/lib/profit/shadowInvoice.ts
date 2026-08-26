import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';

const invoiceEntrySchema = z.object({
  id: z.string().min(1), entryKind: z.enum(['charge', 'credit', 'reversal']), amountUsd: z.number().finite().nonnegative(),
  billingStatus: z.enum(['shadow', 'pending', 'billable', 'submitted', 'invoiced', 'voided', 'disputed']), evidence: z.record(z.unknown()),
}).strict();

export const shadowInvoiceInputSchema = z.object({
  tenantSite: z.string().trim().min(1), periodStart: z.string().datetime(), periodEnd: z.string().datetime(),
  accountMinimumUsd: z.number().finite().nonnegative().default(0), includedCreditUsd: z.number().finite().nonnegative().default(0),
  entries: z.array(invoiceEntrySchema),
}).strict();

export function buildShadowInvoice(input: z.input<typeof shadowInvoiceInputSchema>) {
  const parsed = shadowInvoiceInputSchema.parse(input);
  const charges = parsed.entries.filter((entry) => entry.entryKind === 'charge');
  const credits = parsed.entries.filter((entry) => entry.entryKind !== 'charge');
  const chargeTotal = charges.reduce((sum, entry) => sum + entry.amountUsd, 0);
  const creditTotal = credits.reduce((sum, entry) => sum + entry.amountUsd, 0);
  const gross = Math.max(0, chargeTotal - creditTotal);
  const estimatedTotal = Math.max(0, gross - parsed.includedCreditUsd, parsed.accountMinimumUsd);
  return {
    tenantSite: parsed.tenantSite, periodStart: parsed.periodStart, periodEnd: parsed.periodEnd,
    outcomeCount: charges.length, creditCount: credits.length, chargeTotalUsd: chargeTotal,
    creditTotalUsd: creditTotal, includedCreditUsd: parsed.includedCreditUsd, accountMinimumUsd: parsed.accountMinimumUsd,
    estimatedTotalUsd: estimatedTotal, evidenceCoveragePercent: parsed.entries.length ? Math.round(parsed.entries.filter((entry) => Object.keys(entry.evidence).length > 0).length / parsed.entries.length * 100) : null,
    billingStatus: 'shadow' as const, stripeSubmitted: false, entries: parsed.entries,
  };
}

export async function loadShadowInvoice(input: z.input<typeof shadowInvoiceInputSchema>) {
  const parsed = shadowInvoiceInputSchema.parse(input);
  const { data, error } = await supabaseAdmin.from('billable_outcomes')
    .select('id, entry_kind, amount_usd, billing_status, evidence')
    .eq('tenant_site', parsed.tenantSite)
    .gte('occurred_at', parsed.periodStart)
    .lt('occurred_at', parsed.periodEnd)
    .in('billing_status', ['shadow', 'pending', 'billable']);
  if (error) throw new Error(`Unable to load shadow invoice entries: ${error.message}`);
  return buildShadowInvoice({ ...parsed, entries: (data || []).map((entry) => ({
    id: entry.id,
    entryKind: entry.entry_kind,
    amountUsd: Number(entry.amount_usd),
    billingStatus: entry.billing_status,
    evidence: entry.evidence || {},
  })) });
}
