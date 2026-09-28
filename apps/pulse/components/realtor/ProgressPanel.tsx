'use client';

import { deriveGoalProgress, type ProgressGoal, type ProgressSummary } from '@/lib/realtor-workspace/progress';
import { formatUsdCents } from '@/lib/realtor-workspace/money';

function usd(value: number) {
  return formatUsdCents(String(Math.trunc(value)));
}

export function ProgressPanel({ summary, goals, reviews, timeZone, celebrationsEnabled, hideProgress, busy, onArchive }: {
  summary: ProgressSummary;
  goals: ProgressGoal[];
  reviews: Array<{ localWeekKey: string }>;
  timeZone: string;
  celebrationsEnabled: boolean;
  hideProgress: boolean;
  busy: boolean;
  onArchive: (goal: ProgressGoal) => void;
}) {
  if (hideProgress) return <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-5"><h2 className="text-lg font-bold text-white">Progress is hidden</h2><p className="mt-2 text-sm text-slate-400">Turn on progress features in Today settings whenever you want to see goals and milestones again.</p></section>;
  const derived = deriveGoalProgress(summary, goals, reviews, timeZone);
  return <div className="space-y-5">
    <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-black/10">
      <h2 className="text-lg font-bold text-white">Your progress</h2>
      {derived.progress.length ? <div className="mt-5 space-y-6">{derived.progress.map((goal) => <div key={goal.id}>
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2"><span className="font-semibold capitalize text-white">{goal.metric === 'net_income' ? 'Recorded net income' : goal.metric.replace('_', ' ')}</span><span className="text-sm text-slate-300">{goal.metric === 'net_income' ? usd(goal.actual) + ' / ' + usd(goal.target) : goal.actual + ' / ' + goal.target}</span></div>
        <div role="progressbar" aria-label={goal.metric === 'net_income' ? 'Recorded net income goal' : goal.metric.replace('_', ' ') + ' goal'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.max(0, Math.min(100, Math.floor(goal.visualPercent)))} className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300" style={{ width: goal.visualPercent + '%' }} /></div>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400"><span>{Math.round(goal.rawPercent)}% of target{goal.rawPercent > 100 ? ' · above target' : goal.rawPercent < 0 ? ' · below zero' : ''}</span>{goal.reached ? <span className="text-emerald-200">Goal reached</span> : <span />}</div>
        <button type="button" disabled={busy} onClick={() => onArchive(goal)} className="mt-2 text-xs text-slate-400 underline hover:text-white">Archive goal</button>
      </div>)}</div> : <p className="mt-3 text-sm text-slate-400">Choose an annual target to see progress from your recorded net, distinct closings, or completed weekly reviews.</p>}
      <p className="mt-5 border-t border-white/10 pt-4 text-xs text-slate-500">Manual records only · based on the active ledger and checklist evidence. Correcting or voiding an entry may change progress.</p>
    </section>
    <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-black/10">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold text-white">Milestones</h2><span className="text-xs text-slate-500">{celebrationsEnabled ? 'Quiet highlights; no repeat animation' : 'Celebrations off'}</span></div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">{derived.milestones.map((milestone) => <li key={milestone.id} className={'rounded-xl border p-4 ' + (milestone.earned ? 'border-emerald-300/25 bg-emerald-300/[0.06]' : 'border-white/10 bg-slate-950/40')}>
        <p className="font-semibold text-white">{milestone.earned ? '✓ ' : '○ '}{milestone.title}</p><p className="mt-1 text-xs leading-5 text-slate-400">{milestone.detail}</p>
      </li>)}</ul>
      <p className="mt-4 text-xs text-slate-500">Four-review consistency: {derived.recentReviewCount} of 4 distinct local weeks in the rolling eight-week window.</p>
    </section>
    <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-black/10">
      <h2 className="text-lg font-bold text-white">Why progress changed</h2>
      <p className="mt-1 text-xs leading-5 text-slate-500">Milestones are recalculated from current active records. This private activity trail identifies recorded changes without exposing amounts or your weekly priority.</p>
      {summary.progressHistoryAvailable === false ? <p className="mt-4 text-sm text-slate-400">Progress history is temporarily unavailable; your current totals still come from active records.</p>
        : summary.progressHistory?.length ? <ol className="mt-4 space-y-3">{summary.progressHistory.map((event) => <li key={event.id} className="border-l-2 border-cyan-300/40 pl-4">
          <div className="flex flex-wrap justify-between gap-2"><p className="text-sm font-semibold text-slate-100">{event.title}{event.toStatus && event.title === 'Weekly review no longer completed' ? ' (' + event.toStatus + ')' : ''}</p><time className="text-xs text-slate-500">{formatWhen(event.occurredAt, timeZone)}</time></div>
          <p className="mt-1 text-xs leading-5 text-slate-400">{event.explanation}{event.metric ? ' Goal type: ' + event.metric.replace('_', ' ') + '.' : ''}{event.localWeekKey ? ' Week of ' + event.localWeekKey + (event.timeZone ? ' (' + event.timeZone + ')' : '') + '.' : ''}{event.effectiveDate ? ' Effective date: ' + event.effectiveDate + '.' : ''}</p>
        </li>)}</ol> : <p className="mt-4 text-sm text-slate-400">Progress-changing activity will appear here as entries are added, corrected, voided, or reviewed.</p>}
    </section>
  </div>;
}

function formatWhen(value: string, timeZone: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Time unavailable';
  return new Intl.DateTimeFormat('en-US', { timeZone, dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
