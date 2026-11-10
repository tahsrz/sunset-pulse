import React from 'react';
import type { SellerOverview } from '@/lib/realtor-workspace/sellerOverviewContract';

type SellerFunnel = SellerOverview['funnel'];

const stages: { key: 'requests' | 'replies' | 'held' | 'signed' | 'closed'; label: string; detail: string }[] = [
  { key: 'requests', label: 'Requests', detail: 'Seller requests recorded' },
  { key: 'replies', label: 'Conversations', detail: 'Customer replies recorded' },
  { key: 'held', label: 'Consultations held', detail: 'Consultation milestone recorded' },
  { key: 'signed', label: 'Agreements verified', detail: 'Listing agreement verified' },
  { key: 'closed', label: 'Closings recorded', detail: 'Closing record saved' },
];

export function SellerProgressSummary({ funnel }: { funnel: SellerFunnel }) {
  const startDate = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: funnel.timeZone }).format(new Date(funnel.startAt));

  return <section aria-labelledby="seller-progress-title" className="fieldbook-record rounded-2xl border border-cyan-300/20 bg-slate-900/60 p-5">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 id="seller-progress-title" className="text-xl font-semibold">Seller progress</h2>
        <p className="mt-1 text-xs text-slate-400">Requests from {startDate} through today · {funnel.timeZone}</p>
      </div>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-100/75">Recent request cohort</p>
    </div>
    <ol className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5" aria-label="Recorded seller journey checkpoints">
      {stages.map((stage, index) => <li key={stage.key} className="fieldbook-record flex min-h-32 flex-col rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200/70">{String(index + 1).padStart(2, '0')}</span>
        <h3 className="mt-2 text-sm font-semibold text-white">{stage.label}</h3>
        <strong className="mt-auto pt-3 text-3xl font-semibold tabular-nums text-cyan-100">{funnel[stage.key]}</strong>
        <span className="mt-1 text-[11px] leading-4 text-slate-400">{stage.detail}</span>
      </li>)}
    </ol>
    <p className="mt-4 text-xs leading-5 text-slate-400">Each number is a separately recorded checkpoint for requests created in this period. The counts are not a drop-off chart, and a later checkpoint can exist without an earlier one being recorded.</p>
  </section>;
}
