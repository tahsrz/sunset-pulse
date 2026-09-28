'use client';

import { useState } from 'react';
import { ModalSurface } from './ModalSurface';

type WeeklyReviewOccurrence = { id: string; revision: number; title_snapshot: string; effective_date: string };

export function WeeklyReviewAction({ occurrence, busy, submit }: {
  occurrence: WeeklyReviewOccurrence;
  busy: boolean;
  submit: (url: string, method: 'POST' | 'PATCH', data: unknown, success: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [reviewedUpcomingDates, setReviewedUpcomingDates] = useState(false);
  const [reviewedMissingExpenses, setReviewedMissingExpenses] = useState(false);
  const [priority, setPriority] = useState('');

  const complete = async (event: React.FormEvent) => {
    event.preventDefault();
    const saved = await submit('/api/realtor/planner/' + occurrence.id, 'PATCH', {
      action: 'complete', expectedRevision: occurrence.revision, requestKey: crypto.randomUUID(),
      completionDetails: { weeklyReview: { reviewedUpcomingDates: true, reviewedMissingExpenses: true, priority: priority.trim() } },
    }, 'Weekly review completed and counted for this local week.');
    if (saved) {
      setOpen(false);
      setReviewedUpcomingDates(false);
      setReviewedMissingExpenses(false);
      setPriority('');
    }
  };

  return <>
    <button type="button" disabled={busy} onClick={() => setOpen(true)} className="rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-50">Review week</button>
    {open ? <ModalSurface labelId="weekly-review-title" onClose={() => setOpen(false)}>
        <h2 id="weekly-review-title" className="text-xl font-bold">Weekly business review</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">For “{occurrence.title_snapshot}” due {occurrence.effective_date}, check the real work you reviewed. A review only counts once per local week.</p>
        <form onSubmit={(event) => { void complete(event); }} className="mt-5 space-y-4">
          <label className="flex items-start gap-3 text-sm text-slate-200"><input type="checkbox" required checked={reviewedUpcomingDates} onChange={(event) => setReviewedUpcomingDates(event.target.checked)} className="mt-0.5 accent-cyan-300" /><span>I reviewed upcoming appointments, follow-ups, and deadlines.</span></label>
          <label className="flex items-start gap-3 text-sm text-slate-200"><input type="checkbox" required checked={reviewedMissingExpenses} onChange={(event) => setReviewedMissingExpenses(event.target.checked)} className="mt-0.5 accent-cyan-300" /><span>I checked for business expenses or bill payments that still need recording.</span></label>
          <label className="block text-sm font-medium text-slate-200">My chosen priority for the week<textarea required maxLength={200} value={priority} onChange={(event) => setPriority(event.target.value)} className="mt-1.5 min-h-24 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-cyan-300 focus:outline-none" placeholder="Follow up with the three buyers I showed homes to" /></label>
          <div className="flex gap-2"><button className="rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50" disabled={busy || !reviewedUpcomingDates || !reviewedMissingExpenses || !priority.trim()}>{busy ? 'Saving…' : 'Complete review'}</button><button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10">Cancel</button></div>
        </form>
    </ModalSurface> : null}
  </>;
}
