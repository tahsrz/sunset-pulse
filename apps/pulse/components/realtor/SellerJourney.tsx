import Link from 'next/link';
import type { SellerCaseResult } from '@/lib/realtor-workspace/sellerServiceContract';
import { deriveSellerJourney } from '@/lib/realtor-workspace/sellerJourney';

export function SellerJourney({ result }: { result: SellerCaseResult }) {
  const steps = deriveSellerJourney(result);
  return <section aria-label="Seller relationship journey" className="fieldbook-panel">
    <div className="flex flex-wrap items-end justify-between gap-2 border-b border-white/15 pb-3">
      <div><p className="text-xs uppercase tracking-[0.16em] text-slate-400">Seller folder</p><h2 className="mt-1 text-xl font-semibold">Where things stand</h2></div>
      <p className="text-xs text-slate-400">Only saved conversations, appointments and milestones appear here.</p>
    </div>
    <ol className="mt-2 divide-y divide-white/10">
      {steps.map((step) => <li key={step.key} className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="flex min-w-0 items-start gap-3">
          <span aria-hidden="true" className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${step.state === 'complete' ? 'border-emerald-300/40 text-emerald-200' : step.state === 'current' ? 'border-amber-200/60 text-amber-100' : 'border-white/20 text-slate-500'}`}>
            {step.state === 'complete' ? '✓' : step.state === 'current' ? '•' : '·'}
          </span>
          <div className="min-w-0">
            <p className="font-medium text-slate-100">{step.label}</p>
            <p className="mt-0.5 text-xs text-slate-400">{step.evidence === 'planned' ? 'Planned' : step.evidence === 'recorded' ? 'Recorded' : step.state === 'current' ? 'Next to review' : 'Not recorded'}</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 pl-9 sm:justify-end sm:pl-0">
          {step.occurredAt ? <time className="text-xs text-slate-400" dateTime={step.occurredAt}>{formatJourneyDate(step.occurredAt, result.timeZone)}</time> : null}
          {step.action ? <Link className="text-sm font-semibold text-cyan-200 underline underline-offset-4" href={step.action.href}>{step.action.label}</Link> : null}
        </div>
      </li>)}
    </ol>
  </section>;
}

function formatJourneyDate(value: string, timeZone: string) {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(dateOnly ? `${value}T12:00:00.000Z` : value);
  if (!Number.isFinite(date.getTime())) return value;
  try {
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', ...(dateOnly ? { timeZone: 'UTC' } : { timeZone }) }).format(date);
  } catch {
    return value;
  }
}
