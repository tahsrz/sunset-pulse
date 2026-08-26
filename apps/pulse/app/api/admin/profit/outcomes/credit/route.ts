import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { OUTCOME_DISQUALIFIERS } from '@/lib/profit/outcomeContract';
import { persistDisputeCredit } from '@/lib/profit/billableOutcomeLedger';
import { supabaseAdmin } from '@/lib/supabase';

const requestSchema = z.object({
  outcomeId: z.string().uuid(),
  reason: z.enum(OUTCOME_DISQUALIFIERS),
  evidence: z.record(z.unknown()).default({}),
}).strict();

export async function POST(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid outcome credit request.' }, { status: 400 });

  const { data: row, error } = await supabaseAdmin.from('billable_outcomes').select('*').eq('id', parsed.data.outcomeId).maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!row) return NextResponse.json({ ok: false, error: 'Outcome not found.' }, { status: 404 });
  if (row.entry_kind !== 'charge') return NextResponse.json({ ok: false, error: 'Only charge entries can receive a dispute credit.' }, { status: 400 });
  if (Date.now() - Date.parse(row.occurred_at) > 7 * 86400000) return NextResponse.json({ ok: false, error: 'The seven-day dispute window has expired.' }, { status: 400 });

  try {
    const result = await persistDisputeCredit({
      original: {
        tenantSite: row.tenant_site, agentId: row.agent_id, funnelId: row.funnel_id, leadId: row.lead_id,
        bookingId: row.booking_id, outcomeType: row.outcome_type, outcomeVersion: row.outcome_version,
        entryKind: row.entry_kind, amountUsd: Number(row.amount_usd), occurredAt: row.occurred_at,
        evidence: row.evidence || {}, idempotencyKey: row.idempotency_key, supersedesOutcomeId: row.supersedes_outcome_id,
        billingStatus: row.billing_status, statusReason: row.status_reason, currency: 'USD', attributionWindowDays: row.attribution_window_days, id: row.id,
      },
      reason: parsed.data.reason,
        evidence: { ...parsed.data.evidence, reviewedBy: access.user?.id || access.user?.email || 'operator' },
    });
    return NextResponse.json({ ok: true, duplicate: result.duplicate, credit: result.entry }, { status: result.duplicate ? 200 : 201 });
  } catch (cause) {
    return NextResponse.json({ ok: false, error: cause instanceof Error ? cause.message : 'Unable to create outcome credit.' }, { status: 500 });
  }
}
