'use client';

import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { SellerLeadScheduleDialog } from './SellerLeadScheduleDialog';

import { sellerDailyResultSchema, type SellerDailyData } from '@/lib/realtor-workspace/sellerDailyContract';
import { todayAgendaResultSchema, type TodayAgendaResult } from '@/lib/realtor-workspace/todayAgendaContract';

type UnscheduledSellerRequest = SellerDailyData['unscheduledRequests'][number];

export function SellerDailyPanel({ result, onScheduleSaved, onAgendaReloaded }: {
  result?: unknown; onScheduleSaved?: () => void; onAgendaReloaded?: (agenda: TodayAgendaResult) => void;
}) {
  const router = useRouter();
  const retryRequests = useRef(new Map<string, string>());
  const [selectedLead, setSelectedLead] = useState<UnscheduledSellerRequest | null>(null);
  const controller = useRef<AbortController | null>(null);
  const [replacement, setReplacement] = useState<{ source: unknown; result: unknown } | null>(null);
  const [retryState, setRetryState] = useState<{ source: unknown; pending: boolean; error: string } | null>(null);
  const currentRetry = retryState?.source === result ? retryState : null;
  const parsed = sellerDailyResultSchema.safeParse(replacement && replacement.source === result ? replacement.result : result);
  useEffect(() => () => { controller.current?.abort(); controller.current = null; }, [result]);

  const reload = async () => {
    if (controller.current && !controller.current.signal.aborted) return;
    const request = new AbortController();
    controller.current = request;
    setRetryState({ source: result, pending: true, error: '' });
    try {
      const response = await fetch('/api/realtor/today', { cache: 'no-store', signal: request.signal });
      const payload = await response.json();
      if (!response.ok || payload?.ok !== true) throw new Error();
      const summary = sellerDailyResultSchema.parse(payload.result?.seller);
      if (summary.status === 'unavailable') throw new Error();
      if (!request.signal.aborted) {
        setReplacement({ source: result, result: summary });
        const agenda = todayAgendaResultSchema.safeParse(payload.result?.agenda);
        onAgendaReloaded?.(agenda.success ? agenda.data : { status: 'unavailable' });
      }
    } catch {
      if (!request.signal.aborted) setRetryState({ source: result, pending: true, error: 'Seller activity could not be reloaded. Try again.' });
    } finally {
      if (controller.current === request) {
        controller.current = null;
        setRetryState((current) => current && current.source === result ? { ...current, pending: false } : current);
      }
    }
  };

  if (parsed.success && parsed.data.status === 'not_configured') return <section className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-5">
    <h2 className="text-lg font-bold">Seller business</h2><p className="mt-2 text-sm text-slate-300">Connect an active seller website to see requests and outcomes in your daily workspace.</p>
    <Link href="/seller-inbox" className="mt-3 inline-flex text-sm font-semibold text-cyan-200">Open seller inbox →</Link>
  </section>;
  if (!parsed.success || parsed.data.status !== 'available') return <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
    <h2 className="text-lg font-bold">Seller business</h2><p className="mt-2 text-sm text-slate-400">Seller activity is temporarily unavailable.</p>
    <button type="button" disabled={currentRetry?.pending} onClick={() => void reload()} className="mt-3 text-sm font-semibold text-cyan-200 underline disabled:opacity-50">{currentRetry?.pending ? 'Reloading seller activity…' : 'Retry seller activity'}</button>
    <Link href="/seller-inbox" className="ml-4 mt-3 inline-flex text-sm text-cyan-200 underline">Open seller inbox</Link>
    {currentRetry?.error ? <p role="alert" className="mt-3 text-sm text-rose-200">{currentRetry.error}</p> : null}
  </section>;

  const data = parsed.data.value;
  const counts = data.counts;
  return <section className="rounded-2xl border border-cyan-300/20 bg-slate-900/80 p-5 shadow-xl shadow-black/10">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold">Seller business</h2><p className="mt-1 text-xs text-slate-400">This week · {data.weekStartDate} to {data.weekEndDate} · manually recorded outcomes</p></div><Link href="/seller-inbox" className="text-sm font-semibold text-cyan-200">Open inbox →</Link></div>
    <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {[
        ['New requests', counts.newRequests], ['Customer replies', counts.customerReplies],
        ['Consultations', counts.confirmedConsultations], ['Recorded closings', counts.recordedClosings],
      ].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-white/[0.04] p-3"><dt className="text-[11px] text-slate-400">{label}</dt><dd className="mt-1 text-xl font-bold text-white">{typeof value === 'number' ? value : '—'}</dd></div>)}
    </dl>
    <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_2fr]">
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3"><h3 className="text-xs font-semibold text-slate-200">Request to first contact</h3><p className="mt-1 text-lg font-bold text-white">{data.firstContactTiming?.medianSeconds == null ? '—' : `${Math.round(data.firstContactTiming.medianSeconds / 60)} min median`}</p><p className="text-[11px] text-slate-500">{data.firstContactTiming?.sampleSize ?? 0} requests with recorded contact attempts</p></div>
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3"><h3 className="text-xs font-semibold text-slate-200">Campaign outcomes</h3>{data.campaigns?.length ? <ul className="mt-2 grid gap-1 text-[11px] text-slate-300 sm:grid-cols-2">{data.campaigns.slice(0, 6).map((campaign) => <li key={campaign.campaignKey}>{campaign.campaignKey}: {campaign.requests} requests · {campaign.replyingLeads} replied · {campaign.confirmedConsultations} consultations · {campaign.recordedClosings} closings</li>)}</ul> : <p className="mt-1 text-xs text-slate-500">No campaign outcomes recorded this week.</p>}<p className="mt-2 text-[10px] text-slate-500">Requests use their creation week; replies and outcomes use the week they were recorded. These counts do not establish campaign causation.</p></div>
    </div>
    <div className="mt-5 grid gap-5 lg:grid-cols-3">
      <DailyList title="Unscheduled requests" overflow={data.unscheduledHasMore ? { href: '/seller-inbox', label: 'View more seller requests' } : undefined} empty="No seller requests need an initial response." rows={data.unscheduledRequests || []} render={(row) => <div key={row.id} className="rounded-lg bg-white/[0.04] p-3"><Link href={`/seller-inbox?leadId=${encodeURIComponent(row.id)}`} className="block rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"><span className="font-semibold">{row.name}</span><span className="mt-1 block text-xs text-slate-400">{row.timing ? timingLabel(row.timing) : 'Timing not provided'}</span></Link><button type="button" onClick={() => setSelectedLead(row)} className="mt-3 w-full rounded-lg border border-cyan-300/25 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-300/10">Schedule response</button></div>} />
      <DailyList title="Overdue seller actions" overflow={data.overdueHasMore ? { href: '/planner', label: 'View more overdue actions' } : undefined} empty="No overdue seller actions." rows={data.overdueActions || []} render={(row) => <div key={row.occurrence_id} className="rounded-lg bg-white/[0.04] p-3"><Link href={`/seller-inbox?leadId=${encodeURIComponent(row.lead_id)}`} className="block"><span className="font-semibold">{row.name}</span><span className="mt-1 block text-xs text-slate-400">{row.title_snapshot} · due {row.effective_date}</span></Link><Link href={`/planner?date=${encodeURIComponent(row.effective_date)}`} className="mt-3 inline-flex text-xs font-semibold text-cyan-200">Open scheduled action →</Link></div>} />
      <DailyList title="Confirmed consultations" overflow={data.consultationsHasMore ? { href: '/seller-inbox', label: 'View more consultations' } : undefined} empty="No upcoming consultations recorded." rows={data.consultations || []} render={(row) => <Link key={row.event_id} href={`/seller-inbox?leadId=${encodeURIComponent(row.lead_id)}`} className="block rounded-lg bg-white/[0.04] p-3 hover:bg-white/[0.08]"><span className="font-semibold">{row.name}</span><time className="mt-1 block text-xs text-slate-400" dateTime={row.occurred_at}>{new Date(row.occurred_at).toLocaleString(undefined, { timeZone: data.timeZone })}</time></Link>} />
    </div>
    <p className="mt-4 text-[11px] text-slate-500">Replies, consultations, and closings count only when explicitly recorded. Scheduling a reminder does not count as customer contact.</p>
    {selectedLead ? <SellerLeadScheduleDialog leadId={selectedLead.id} leadName={selectedLead.name} leadRevision={selectedLead.revision} timeZone={data.timeZone} retryRequests={retryRequests.current} actionKey="initial-response:v1" onClose={() => setSelectedLead(null)} onSaved={() => { setSelectedLead(null); onScheduleSaved?.(); setReplacement({ source: result, result: { status: 'unavailable' } }); void reload(); router.refresh(); }} /> : null}
  </section>;
}

function DailyList<T>({ title, empty, rows, render, overflow }: {
  title: string; empty: string; rows: T[]; render: (row: T) => ReactNode;
  overflow?: { href: string; label: string };
}) {
  return <section><h3 className="mb-2 text-sm font-semibold text-slate-200">{title}</h3>
    {rows.length ? <div className="space-y-2">{rows.map(render)}</div> : <p className="text-xs leading-5 text-slate-500">{empty}</p>}
    {overflow ? <Link href={overflow.href} className="mt-3 inline-flex text-xs font-semibold text-cyan-200">{overflow.label} →</Link> : null}
  </section>;
}

function timingLabel(value: string) {
  return ({
    exploring: 'Exploring options', 'within-30-days': 'Within 30 days',
    'one-to-three-months': '1–3 months', 'three-to-six-months': '3–6 months', later: 'Later',
  } as Record<string, string>)[value] || 'Timing not provided';
}
