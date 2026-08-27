import Link from 'next/link';
import { headers } from 'next/headers';
import { ArrowLeft, ArrowUpRight, BellRing, CheckCircle2, CircleDollarSign, Clock3, Gauge, Phone, ShieldAlert, Target } from 'lucide-react';
import { getOperatorAccess } from '@/lib/core/operator_access';
import { getRequestHostFromHeaders } from '@/lib/core/routeAuth';
import { loadProfitFunnelAnalytics, type ProfitFunnelAnalytics } from '@/lib/profit/profitFunnelAnalytics';
import { loadInternalCostSummary, type InternalCostSummary } from '@/lib/profit/internalCostLedger';
import { loadShadowInvoice } from '@/lib/profit/shadowInvoice';
import { loadShadowCheckpointDecision } from '@/lib/profit/shadowCheckpoint';
import { DisputeCreditForm } from './DisputeCreditForm';
import ConversionBaselineForm from './ConversionBaselineForm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Profit Scorecard | Sunset Pulse',
  description: 'Operator scorecard for Jamie lead conversion and delivery economics.',
};

export default async function ProfitScorecardPage() {
  const requestHeaders = await headers();
  const access = await getOperatorAccess(getRequestHostFromHeaders(requestHeaders));
  if (!access.allowed) return <AccessDenied reason={access.reason} />;
  if (access.user?.role === 'realtor') return <AccessDenied reason="Organization profit analytics require admin or operator access." />;

  let scorecard: ProfitFunnelAnalytics | null = null;
  let costs: InternalCostSummary | null = null;
  let invoice: Awaited<ReturnType<typeof loadShadowInvoice>> | null = null;
  let checkpointDecision: Awaited<ReturnType<typeof loadShadowCheckpointDecision>> | null = null;
  let error = '';
  try {
    const periodEnd = new Date().toISOString();
    const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    [scorecard, costs, invoice, checkpointDecision] = await Promise.all([
      loadProfitFunnelAnalytics(),
      loadInternalCostSummary(),
      loadShadowInvoice({ tenantSite: getRequestHostFromHeaders(requestHeaders) || 'unknown', periodStart, periodEnd, accountMinimumUsd: 0, includedCreditUsd: 0, entries: [] }),
      loadShadowCheckpointDecision({ tenantSite: getRequestHostFromHeaders(requestHeaders) || 'unknown', legalApproved: process.env.LUNA_LEGAL_APPROVED === 'true' }),
    ]);
  } catch (cause) {
    error = cause instanceof Error ? cause.message : 'Scorecard unavailable.';
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin/agent-leads" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-cyan-200/70 hover:text-cyan-100">
          <ArrowLeft size={14} /> Lead workspace
        </Link>
        <header className="mt-8 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-300/70">Profit control surface</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-white">Jamie revenue scorecard</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Seven-day view of qualified demand, agent attention, delivery reliability, pipeline value, and acquisition cost.</p>
          </div>
          <Link href="/api/admin/profit/scorecard" className="inline-flex items-center gap-2 border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:border-cyan-200/40 hover:text-white">
            JSON endpoint <ArrowUpRight size={14} />
          </Link>
          <Link href={`/api/admin/profit/invoice?site=${encodeURIComponent(getRequestHostFromHeaders(requestHeaders) || 'unknown')}`} className="inline-flex items-center gap-2 border border-violet-300/20 px-3 py-2 text-xs font-bold text-violet-200 hover:border-violet-200/50 hover:text-white">
            Shadow invoice <ArrowUpRight size={14} />
          </Link>
        </header>

        {error ? <div className="mt-8 border border-rose-300/20 bg-rose-400/10 p-4 text-sm text-rose-100">{error}</div> : null}
        {scorecard ? <Scorecard scorecard={scorecard} costs={costs} invoice={invoice} checkpointDecision={checkpointDecision} /> : null}
        <ConversionBaselineForm />
      </div>
    </main>
  );
}

function Scorecard({ scorecard, costs, invoice, checkpointDecision }: { scorecard: ProfitFunnelAnalytics; costs: InternalCostSummary | null; invoice: Awaited<ReturnType<typeof loadShadowInvoice>> | null; checkpointDecision: Awaited<ReturnType<typeof loadShadowCheckpointDecision>> | null }) {
  const handoff = scorecard.funnel.find((stage) => stage.id === 'handoffCompleted');
  const closed = scorecard.funnel.find((stage) => stage.id === 'closed');
  const cards = [
    { label: 'Pipeline value', value: money(scorecard.leads.estimatedPipelineValue), detail: `${scorecard.leads.total} leads across all sources`, icon: CircleDollarSign },
    { label: 'Handoff conversion', value: percent(handoff?.conversionRate), detail: `${handoff?.count || 0} completed handoffs`, icon: Target },
    { label: 'Lead qualification', value: percent(scorecard.leads.qualificationRate), detail: `${scorecard.leads.completedLeads}/${scorecard.leads.jamieTotal} Jamie leads touring or closed`, icon: Target },
    { label: 'Closed leads', value: String(closed?.count || 0), detail: `${scorecard.leads.closedLeads} current closed records`, icon: Gauge },
    { label: 'Cost / qualified lead', value: money(scorecard.acquisition.costPerQualifiedLead), detail: `${money(scorecard.acquisition.modelCost)} model + ${money(scorecard.acquisition.notificationCost)} alerts`, icon: CircleDollarSign },
    { label: 'Hot alerts read', value: percent(scorecard.notifications.hotReadRate), detail: `${scorecard.notifications.hotRead}/${scorecard.notifications.hotTotal} high-priority alerts; not confirmed contact`, icon: BellRing },
    { label: 'Contact controls opened', value: String(scorecard.notifications.actionOpened), detail: 'Call, email, or SMS opened; not confirmed sent', icon: ArrowUpRight },
    { label: 'Contact attempts', value: String(scorecard.engagement.contacted), detail: `${percent(scorecard.engagement.contactSlaRate)} within 10 min; ${scorecard.engagement.contactSlaTarget}% target`, icon: Phone },
    { label: 'Customer responses', value: String(scorecard.engagement.responded), detail: `${scorecard.engagement.appointments} booked appointments`, icon: Target },
    { label: 'Delivery time', value: seconds(scorecard.notifications.averageDeliverySeconds), detail: `${percent(scorecard.notifications.deliverySlaRate)} within 60 sec; ${scorecard.notifications.deliverySlaTarget}% target`, icon: Clock3 },
    { label: 'Funnel identity', value: percent(coverage(scorecard.identity.leadsLinked, scorecard.identity.leadsTotal)), detail: `${scorecard.identity.deliveriesLinked}/${scorecard.identity.deliveriesTotal} deliveries linked`, icon: Gauge },
  ];

  return <>
    <section className="mt-8 border border-amber-300/20 bg-amber-400/[0.05] p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-sm font-black uppercase tracking-[0.16em] text-white">Pricing decision</h2><p className="mt-2 text-xs text-slate-400">Evidence-gated shadow result. Launch remains blocked without explicit legal approval and complete observation data.</p></div><span className="border border-amber-300/30 px-3 py-1 text-xs font-black uppercase text-amber-200">{checkpointDecision?.decision.decision.replaceAll('_', ' ') || 'Unknown'}</span></div><div className="mt-4 grid gap-3 sm:grid-cols-5"><div><p className="text-xs text-slate-500">Evidence days</p><p className="mt-1 text-2xl font-black text-white">{checkpointDecision?.evidenceDays ?? '—'} / 14</p></div><div><p className="text-xs text-slate-500">Margin</p><p className="mt-1 text-2xl font-black text-white">{checkpointDecision?.averages.marginPercent == null ? 'Unknown' : `${checkpointDecision.averages.marginPercent.toFixed(1)}%`}</p></div><div><p className="text-xs text-slate-500">Unknown metrics</p><p className="mt-1 text-2xl font-black text-white">{checkpointDecision?.unknownMetricCount ?? '—'}</p><p className="mt-1 text-[10px] text-slate-500">{checkpointDecision?.unknownMetrics.join(', ') || 'None'}</p></div><div><p className="text-xs text-slate-500">Gate</p><p className="mt-1 text-sm font-bold text-white">{checkpointDecision?.evidenceDays != null && checkpointDecision.evidenceDays >= 14 ? 'Observation complete' : 'Continue shadow'}</p></div><div><p className="text-xs text-slate-500">Reason</p><p className="mt-1 text-sm font-bold text-white">{checkpointDecision?.decision.reasons.join(', ') || 'No checkpoint data'}</p></div></div></section>
    <section className="mt-8 border border-violet-300/20 bg-violet-400/[0.05] p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-sm font-black uppercase tracking-[0.16em] text-white">Shadow invoice</h2><p className="mt-2 text-xs text-slate-400">Estimate only. No customer charge or Stripe submission.</p></div><span className="border border-violet-300/30 px-3 py-1 text-xs font-black uppercase text-violet-200">Shadow only</span></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div><p className="text-xs text-slate-500">Estimated total</p><p className="mt-1 text-2xl font-black text-white">{money(invoice?.estimatedTotalUsd ?? null)}</p></div><div><p className="text-xs text-slate-500">Charges / credits</p><p className="mt-1 text-2xl font-black text-white">{invoice ? `${money(invoice.chargeTotalUsd)} / ${money(invoice.creditTotalUsd)}` : '—'}</p></div><div><p className="text-xs text-slate-500">Outcomes</p><p className="mt-1 text-2xl font-black text-white">{invoice?.outcomeCount ?? '—'}</p></div><div><p className="text-xs text-slate-500">Evidence coverage</p><p className="mt-1 text-2xl font-black text-white">{invoice?.evidenceCoveragePercent == null ? 'Unknown' : `${invoice.evidenceCoveragePercent}%`}</p></div></div></section>
    <section className="mt-5 border border-white/10 bg-white/[0.03] p-5"><h2 className="text-sm font-black uppercase tracking-[0.16em] text-white">Outcome entries</h2><div className="mt-4 space-y-3">{invoice?.entries?.length ? invoice.entries.map((entry) => <div key={entry.id} className="border border-white/[0.08] p-3"><div className="flex flex-wrap items-center justify-between gap-2 text-xs"><span className="font-bold text-slate-300">{entry.id}</span><span className="text-slate-500">{entry.entryKind} · ${entry.amountUsd.toFixed(2)}</span></div>{entry.entryKind === 'charge' ? <DisputeCreditForm outcomeId={entry.id} /> : null}</div>) : <p className="text-sm text-slate-500">No shadow outcomes in this period.</p>}</div></section>
    <section className="mt-8 border border-cyan-300/20 bg-cyan-400/[0.05] p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-sm font-black uppercase tracking-[0.16em] text-white">Ledger cost coverage</h2><p className="mt-2 text-xs text-slate-400">Seven-day internal costs from provider receipts. Unknown amounts remain unknown.</p></div><span className={`border px-3 py-1 text-xs font-black uppercase ${costs?.costsKnown ? 'border-emerald-300/30 text-emerald-200' : 'border-amber-300/30 text-amber-200'}`}>{costs?.costsKnown ? 'Complete' : 'Partial'}</span></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div><p className="text-xs text-slate-500">Known cost</p><p className="mt-1 text-2xl font-black text-white">{money(costs?.totalUsd ?? null)}</p></div><div><p className="text-xs text-slate-500">Receipts</p><p className="mt-1 text-2xl font-black text-white">{costs ? `${costs.knownEntries}/${costs.entries}` : '—'}</p></div><div><p className="text-xs text-slate-500">Model / alerts</p><p className="mt-1 text-2xl font-black text-white">{money((costs?.byType.model as number | null | undefined) ?? null)} / {money((costs?.byType.email_sms as number | null | undefined) ?? null)}</p></div></div></section>
    <section className={`mt-8 border p-5 ${scorecard.baselineReadiness.status === 'ready' ? 'border-emerald-300/25 bg-emerald-400/[0.06]' : 'border-amber-300/25 bg-amber-400/[0.06]'}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3">{scorecard.baselineReadiness.status === 'ready' ? <CheckCircle2 className="mt-0.5 text-emerald-200" size={20} /> : <ShieldAlert className="mt-0.5 text-amber-200" size={20} />}<div><h2 className="text-sm font-black uppercase tracking-[0.16em] text-white">Margin experiment readiness</h2><p className="mt-2 text-sm text-slate-300">{scorecard.baselineReadiness.status === 'ready' ? 'Baseline passed. Margin experiments may begin with rollback controls.' : 'Continue collecting authoritative baseline data. Do not optimize channel or model spend yet.'}</p></div></div>
        <span className={`border px-3 py-1 text-xs font-black uppercase ${scorecard.baselineReadiness.status === 'ready' ? 'border-emerald-300/30 text-emerald-200' : 'border-amber-300/30 text-amber-200'}`}>{scorecard.baselineReadiness.status.replace('_', ' ')}</span>
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{scorecard.baselineReadiness.criteria.map((criterion) => <div key={criterion.id} className="border border-white/[0.08] p-3"><div className="flex items-center justify-between gap-2"><p className="text-xs font-bold text-slate-300">{criterion.label}</p><span className={criterion.met ? 'text-emerald-200' : 'text-amber-200'}>{criterion.met ? 'Pass' : 'Collect'}</span></div><p className="mt-2 text-lg font-black text-white">{readinessValue(criterion.actual, criterion.unit)} <span className="text-xs font-medium text-slate-500">/ {readinessValue(criterion.target, criterion.unit)}</span></p></div>)}</div>
    </section>
    <section className="mt-8 border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-black uppercase tracking-[0.16em] text-white">Seven-day baseline</h2><p className="mt-2 text-xs text-slate-400">{scorecard.scopes.jamieFunnel}</p></div><Confidence value={scorecard.baseline.confidence} /></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(scorecard.baseline.metrics).map(([id, metric]) => <div key={id} className="border border-white/[0.08] p-4"><div className="flex items-center justify-between gap-2"><p className="text-xs font-bold text-slate-300">{baselineLabel(id)}</p><Confidence value={metric.confidence} /></div><p className="mt-3 text-2xl font-black text-white">{id === 'revenue' || id === 'totalVariableCost' ? money(metric.value) : metric.value ?? 'Unknown'}</p></div>)}
      </div>
      <p className="mt-4 text-xs text-slate-500">Channel comparison: {scorecard.scopes.channelComparison}. Notification operations: {scorecard.scopes.notificationOperations}.</p>
    </section>
    <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map(({ label, value, detail, icon: Icon }) => <article key={label} className="border border-white/10 bg-white/[0.03] p-5"><Icon size={18} className="text-cyan-200" /><p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p><p className="mt-2 text-3xl font-black text-white">{value}</p><p className="mt-2 text-xs text-slate-400">{detail}</p></article>)}
    </section>
    <section className="mt-8 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <article className="border border-white/10 bg-white/[0.03] p-5"><h2 className="text-sm font-black uppercase tracking-[0.16em] text-white">Funnel</h2><div className="mt-5 space-y-4">{scorecard.funnel.map((stage) => <div key={stage.id}><div className="flex items-center justify-between text-sm"><span className="text-slate-300">{stage.label}</span><span className="font-bold text-white">{stage.count} <span className="text-xs text-slate-500">({percent(stage.conversionRate)})</span></span></div><div className="mt-2 h-2 bg-slate-800"><div className="h-2 bg-cyan-300" style={{ width: `${Math.min(stage.conversionRate || 0, 100)}%` }} /></div></div>)}</div></article>
      <article className="border border-white/10 bg-white/[0.03] p-5"><h2 className="text-sm font-black uppercase tracking-[0.16em] text-white">Attention leaks</h2><dl className="mt-5 space-y-4 text-sm"><Row label="Failed notifications" value={scorecard.failureSignals.failedNotifications} /><Row label="Suppressed notifications" value={scorecard.failureSignals.suppressedNotifications} /><Row label="Unanswered questions" value={scorecard.failureSignals.unansweredQuestions} /><Row label="Closed leads" value={scorecard.leads.closedLeads} /></dl></article>
    </section>
    <section className="mt-5 border border-white/10 bg-white/[0.03] p-5"><h2 className="text-sm font-black uppercase tracking-[0.16em] text-white">Pipeline by source</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{scorecard.leads.bySource.map((source) => <div key={source.source} className="border border-white/[0.08] p-4"><p className="truncate text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{source.source}</p><p className="mt-3 text-2xl font-black text-white">{money(source.estimatedPipelineValue)}</p><p className="mt-1 text-xs text-slate-500">{source.leads} lead{source.leads === 1 ? '' : 's'} · {source.qualified} qualified · {source.closed} closed · {source.valuedLeads} valued</p></div>)}</div></section>
    <section className="mt-5 border border-white/10 bg-white/[0.03] p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-black uppercase tracking-[0.16em] text-white">Commercial failure audit</h2><p className="mt-2 text-xs text-slate-400">{scorecard.failureAudit.audited}/{scorecard.failureAudit.target} evidence-backed failures reviewed; transcripts are not stored.</p></div><Confidence value={scorecard.failureAudit.audited >= scorecard.failureAudit.target ? 'verified' : scorecard.failureAudit.audited ? 'partial' : 'unknown'} /></div><div className="mt-5 grid gap-3 lg:grid-cols-3">{scorecard.failureAudit.topLeaks.length ? scorecard.failureAudit.topLeaks.map((leak) => <article key={leak.category} className="border border-white/[0.08] p-4"><p className="text-xs font-black uppercase text-rose-200">{baselineLabel(leak.category)}</p><p className="mt-3 text-2xl font-black text-white">{leak.count}</p><p className="mt-2 text-xs leading-5 text-slate-400">Owner: {leak.owner}. {leak.intervention}</p><p className="mt-3 text-xs font-bold text-cyan-200">Expected: {leak.expectedMetric}</p><p className="mt-2 text-xs text-slate-500">Known opportunity: {money(leak.estimatedLostOpportunity)}</p></article>) : <p className="text-sm text-slate-500">No evidence-backed commercial failures are available in this window.</p>}</div></section>
  </>;
}

function Row({ label, value }: { label: string; value: number }) { return <div className="flex items-center justify-between border-b border-white/[0.06] pb-3"><dt className="text-slate-400">{label}</dt><dd className="font-black text-white">{value}</dd></div>; }

function Confidence({ value }: { value: 'verified' | 'partial' | 'unknown' }) { const styles = value === 'verified' ? 'border-emerald-300/20 text-emerald-200' : value === 'partial' ? 'border-amber-300/20 text-amber-200' : 'border-slate-400/20 text-slate-400'; return <span className={`border px-2 py-1 text-[10px] font-black uppercase ${styles}`}>{value}</span>; }

function baselineLabel(value: string) { return value.replaceAll('_', ' ').replace(/([A-Z])/g, ' $1').replace(/^./, (character) => character.toUpperCase()); }

function coverage(linked: number, total: number) { return total ? Math.round((linked / total) * 100) : null; }
function percent(value: number | null | undefined) { return value === null || value === undefined ? '—' : `${value}%`; }
function seconds(value: number | null) { return value === null ? '—' : `${value}s`; }
function money(value: number | null) { return value === null ? '—' : `$${value.toFixed(2)}`; }
function readinessValue(value: number, unit: 'days' | 'leads' | 'percent') { return unit === 'percent' ? `${value}%` : unit === 'days' ? `${value}d` : String(value); }
function AccessDenied({ reason }: { reason: string }) { return <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100"><section className="mx-auto max-w-3xl border border-red-300/30 bg-red-500/10 p-8"><p className="text-xs font-black uppercase tracking-[0.24em] text-red-200">Operator access</p><h1 className="mt-3 text-3xl font-black text-white">Access denied</h1><p className="mt-4 leading-7 text-red-100">{reason}</p></section></main>; }
