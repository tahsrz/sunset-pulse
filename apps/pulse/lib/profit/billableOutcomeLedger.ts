import { z } from 'zod';
import {
  BILLABLE_OUTCOME_TYPES,
  OUTCOME_DISQUALIFIERS,
  OUTCOME_DEFINITIONS,
  type BillableOutcomeType,
} from '@/lib/profit/outcomeContract';
import { supabaseAdmin } from '@/lib/supabase';

export const billableOutcomeEntrySchema = z.object({
  tenantSite: z.string().trim().min(1).max(180),
  agentId: z.string().trim().min(1).max(120),
  funnelId: z.string().uuid(),
  leadId: z.string().uuid(),
  bookingId: z.string().uuid().nullable().default(null),
  outcomeType: z.enum(BILLABLE_OUTCOME_TYPES),
  outcomeVersion: z.number().int().positive().default(1),
  entryKind: z.enum(['charge', 'credit', 'reversal']).default('charge'),
  amountUsd: z.number().finite().nonnegative(),
  occurredAt: z.string().datetime(),
  evidence: z.record(z.unknown()).default({}),
  idempotencyKey: z.string().trim().min(16).max(220),
  supersedesOutcomeId: z.string().uuid().nullable().default(null),
  billingStatus: z.enum(['shadow', 'pending', 'billable', 'submitted', 'invoiced', 'voided', 'disputed']).default('shadow'),
  statusReason: z.string().trim().max(500).nullable().default(null),
}).strict().superRefine((value, context) => {
  const expected = OUTCOME_DEFINITIONS[value.outcomeType].priceUsd;
  if (value.entryKind === 'charge' && value.amountUsd !== expected) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['amountUsd'], message: `Charge must match the ${value.outcomeType} price hypothesis of $${expected}.` });
  }
  if (value.entryKind !== 'charge' && !value.supersedesOutcomeId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['supersedesOutcomeId'], message: 'Credits and reversals must identify the entry they compensate.' });
  }
});

export type BillableOutcomeEntry = z.infer<typeof billableOutcomeEntrySchema> & {
  currency: 'USD';
  attributionWindowDays: 30;
};

export function buildBillableOutcomeEntry(input: z.input<typeof billableOutcomeEntrySchema>): BillableOutcomeEntry {
  const parsed = billableOutcomeEntrySchema.parse(input);
  return {
    ...parsed,
    currency: 'USD',
    attributionWindowDays: 30,
  };
}

export function outcomePriceHypothesis(outcome: BillableOutcomeType) {
  return OUTCOME_DEFINITIONS[outcome].priceUsd;
}

export function buildOutcomeCompensationEntries(input: {
  previous: BillableOutcomeEntry & { id: string };
  next: BillableOutcomeEntry;
}) {
  if (input.previous.funnelId !== input.next.funnelId || input.previous.leadId !== input.next.leadId) {
    throw new Error('Outcome compensation requires the same funnel and lead.');
  }
  if (input.previous.outcomeType === input.next.outcomeType || input.next.amountUsd <= input.previous.amountUsd) return [];
  const { currency: _previousCurrency, attributionWindowDays: _previousWindow, id: _previousId, ...previousInput } = input.previous;
  const { currency: _nextCurrency, attributionWindowDays: _nextWindow, ...nextInput } = input.next;
  return [
    buildBillableOutcomeEntry({ ...previousInput, entryKind: 'credit', amountUsd: 0, supersedesOutcomeId: input.previous.id, idempotencyKey: `${input.next.idempotencyKey}:credit:${input.previous.id}`, statusReason: `Superseded by ${input.next.outcomeType}.` }),
    buildBillableOutcomeEntry({ ...nextInput, entryKind: 'charge', supersedesOutcomeId: input.previous.id, idempotencyKey: `${input.next.idempotencyKey}:charge` }),
  ];
}

export function buildDisputeCreditEntry(input: {
  original: BillableOutcomeEntry & { id: string };
  reason: (typeof OUTCOME_DISQUALIFIERS)[number];
  evidence?: Record<string, unknown>;
}) {
  return buildBillableOutcomeEntry({
    ...(({ currency: _currency, attributionWindowDays: _window, id: _id, ...entry }) => entry)(input.original),
    entryKind: 'credit', amountUsd: 0, supersedesOutcomeId: input.original.id,
    billingStatus: 'shadow', statusReason: `Credit: ${input.reason}.`,
    evidence: { ...input.original.evidence, ...input.evidence, creditReason: input.reason },
    idempotencyKey: `${input.original.idempotencyKey}:credit:${input.reason}`,
  });
}

export async function persistDisputeCredit(input: {
  original: BillableOutcomeEntry & { id: string };
  reason: (typeof OUTCOME_DISQUALIFIERS)[number];
  evidence?: Record<string, unknown>;
}) {
  const credit = buildDisputeCreditEntry(input);
  const { currency: _currency, attributionWindowDays: _window, ...rawCredit } = credit;
  return persistShadowOutcome(rawCredit);
}

export async function persistOutcomeCompensation(input: {
  previous: BillableOutcomeEntry & { id: string };
  next: BillableOutcomeEntry;
}) {
  const entries = buildOutcomeCompensationEntries(input);
  const results = [];
  for (const entry of entries) results.push(await persistShadowOutcome(entry));
  return results;
}

type PersistResult = {
  entry: BillableOutcomeEntry & { id: string };
  duplicate: boolean;
};

export async function persistShadowOutcome(
  input: z.input<typeof billableOutcomeEntrySchema>,
): Promise<PersistResult> {
  const entry = buildBillableOutcomeEntry(input);
  const lead = await readLeadLineage(entry);
  if (entry.bookingId) await readBookingLineage(entry, lead);

  const existing = await readByIdempotencyKey(entry.idempotencyKey);
  if (existing) return { entry: existing as unknown as PersistResult['entry'], duplicate: true };

  const { data, error } = await supabaseAdmin
    .from('billable_outcomes')
    .insert({
      tenant_site: lead.site,
      agent_id: lead.agent_id,
      funnel_id: lead.funnel_id,
      lead_id: lead.id,
      booking_id: entry.bookingId,
      outcome_type: entry.outcomeType,
      outcome_version: entry.outcomeVersion,
      entry_kind: entry.entryKind,
      amount_usd: entry.amountUsd,
      currency: entry.currency,
      occurred_at: entry.occurredAt,
      attribution_window_days: entry.attributionWindowDays,
      evidence: entry.evidence,
      idempotency_key: entry.idempotencyKey,
      supersedes_outcome_id: entry.supersedesOutcomeId,
      billing_status: entry.billingStatus,
      status_reason: entry.statusReason,
    })
    .select('id, tenant_site, agent_id, funnel_id, lead_id, booking_id, outcome_type, outcome_version, entry_kind, amount_usd, currency, occurred_at, attribution_window_days, evidence, idempotency_key, supersedes_outcome_id, billing_status, status_reason')
    .single();

  if (error) {
    if (error.code === '23505') {
      const raced = await readByIdempotencyKey(entry.idempotencyKey);
      if (raced) return { entry: raced as unknown as PersistResult['entry'], duplicate: true };
    }
    throw new Error(`Unable to persist shadow outcome: ${error.message}`);
  }

  return { entry: data as unknown as PersistResult['entry'], duplicate: false };
}

async function readLeadLineage(entry: BillableOutcomeEntry) {
  const { data, error } = await supabaseAdmin
    .from('agent_site_leads')
    .select('id, funnel_id, agent_id, site')
    .eq('id', entry.leadId)
    .eq('funnel_id', entry.funnelId)
    .eq('agent_id', entry.agentId)
    .eq('site', entry.tenantSite)
    .maybeSingle();
  if (error) throw new Error(`Unable to verify outcome lead lineage: ${error.message}`);
  if (!data) throw new Error('Outcome lineage does not match the selected lead.');
  return data as { id: string; funnel_id: string; agent_id: string; site: string };
}

async function readBookingLineage(entry: BillableOutcomeEntry, lead: { id: string; funnel_id: string; agent_id: string; site: string }) {
  const { data, error } = await supabaseAdmin
    .from('scheduling_bookings')
    .select('id, funnel_id, lead_id, agent_id, site, status')
    .eq('id', entry.bookingId)
    .eq('funnel_id', lead.funnel_id)
    .eq('lead_id', lead.id)
    .eq('agent_id', lead.agent_id)
    .eq('site', lead.site)
    .maybeSingle();
  if (error) throw new Error(`Unable to verify outcome booking lineage: ${error.message}`);
  if (!data || ['cancelled', 'rejected'].includes(data.status)) throw new Error('Outcome booking lineage is invalid.');
}

async function readByIdempotencyKey(idempotencyKey: string) {
  const { data, error } = await supabaseAdmin
    .from('billable_outcomes')
    .select('id, tenant_site, agent_id, funnel_id, lead_id, booking_id, outcome_type, outcome_version, entry_kind, amount_usd, currency, occurred_at, attribution_window_days, evidence, idempotency_key, supersedes_outcome_id, billing_status, status_reason')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();
  if (error) throw new Error(`Unable to read shadow outcome: ${error.message}`);
  return data;
}
