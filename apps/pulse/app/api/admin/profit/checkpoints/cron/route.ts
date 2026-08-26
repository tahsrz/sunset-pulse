import { NextRequest, NextResponse } from 'next/server';
import { loadProfitFunnelAnalytics } from '@/lib/profit/profitFunnelAnalytics';
import { loadShadowInvoice } from '@/lib/profit/shadowInvoice';
import { loadInternalCostSummary } from '@/lib/profit/internalCostLedger';
import { persistShadowCheckpoint } from '@/lib/profit/shadowCheckpoint';
import { loadShadowQuality } from '@/lib/profit/shadowQuality';
import { calculateConversionDeltas } from '@/lib/profit/conversionBaseline';
import { loadConversionBaseline } from '@/lib/profit/conversionBaselineStore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  const tenantSite = request.nextUrl.searchParams.get('site') || process.env.SHADOW_BILLING_SITE;
  if (!tenantSite) return NextResponse.json({ ok: false, error: 'A tenant site is required.' }, { status: 400 });
  try {
    const now = new Date();
    const [analytics, invoice, costs, quality, baseline] = await Promise.all([
      checkpointDependency('analytics', () => loadProfitFunnelAnalytics(now)),
      checkpointDependency('invoice', () => loadShadowInvoice({ tenantSite, periodStart: new Date(now.getTime() - 7 * 86400000).toISOString(), periodEnd: now.toISOString(), accountMinimumUsd: 0, includedCreditUsd: 0, entries: [] })),
      checkpointDependency('costs', () => loadInternalCostSummary(now)),
      checkpointDependency('quality', () => loadShadowQuality({ tenantSite, periodStart: new Date(now.getTime() - 7 * 86400000).toISOString(), periodEnd: now.toISOString() })),
      checkpointDependency('baseline', () => loadConversionBaseline(tenantSite)),
    ]);
    const observedHandoff = analytics.funnel.find((stage: { id: string }) => stage.id === 'handoffCompleted')?.conversionRate ?? null;
    const observedAppointment = analytics.funnel.find((stage: { id: string }) => stage.id === 'tourRequested')?.conversionRate ?? null;
    const conversionDeltas = baseline && observedHandoff !== null && observedAppointment !== null
      ? calculateConversionDeltas({ baseline: { handoffPercent: baseline.handoffPercent, appointmentPercent: baseline.appointmentPercent }, observed: { handoffPercent: observedHandoff, appointmentPercent: observedAppointment } })
      : { handoffConversionDeltaPercent: null, appointmentConversionDeltaPercent: null };
    const revenue = invoice.estimatedTotalUsd;
    const margin = revenue > 0 && costs.totalUsd !== null ? ((revenue - costs.totalUsd) / revenue) * 100 : null;
    const checkpoint = await persistShadowCheckpoint({ tenantSite, checkpoint: { date: now.toISOString().slice(0, 10), marginPercent: margin, duplicateRatePercent: quality.duplicateRatePercent, disputeRatePercent: quality.disputeRatePercent, pipelineMultiple: revenue > 0 && analytics.leads.estimatedPipelineValue !== null ? analytics.leads.estimatedPipelineValue / revenue : null, ...conversionDeltas }, evidence: { source: 'profit-checkpoint-cron', invoiceOutcomeCount: invoice.outcomeCount, invoiceCreditCount: invoice.creditCount, invoiceEvidenceCoveragePercent: invoice.evidenceCoveragePercent, knownCostEntries: costs.knownEntries, qualityObservedRows: quality.observedRows, baselineWindow: baseline ? { start: baseline.windowStart, end: baseline.windowEnd } : null, observedConversionRates: { handoffPercent: observedHandoff, appointmentPercent: observedAppointment }, unknownMetrics: [...(conversionDeltas.handoffConversionDeltaPercent === null ? ['handoffConversionDeltaPercent'] : []), ...(conversionDeltas.appointmentConversionDeltaPercent === null ? ['appointmentConversionDeltaPercent'] : [])] } });
    return NextResponse.json({ ok: true, checkpoint });
  } catch (error) {
    console.error('[SHADOW_CHECKPOINT_CRON]', error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: 'Shadow checkpoint failed.' }, { status: 500 });
  }
}

async function checkpointDependency<T>(name: string, load: () => Promise<T>): Promise<T> {
  try {
    return await load();
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error);
    throw new Error(`checkpoint dependency ${name} failed: ${cause}`);
  }
}
