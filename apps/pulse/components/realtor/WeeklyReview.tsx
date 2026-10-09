'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ModalSurface } from './ModalSurface';
import { sellerReviewSummarySchema, type SellerReviewSummary } from '@/lib/realtor-workspace/sellerReviewContract';

type WeeklyReviewOccurrence = { id: string; revision: number; title_snapshot: string; effective_date: string };

export function WeeklyReviewAction({ occurrence, busy, submit }: {
  occurrence: WeeklyReviewOccurrence;
  busy: boolean;
  submit: (url: string, method: 'POST' | 'PATCH', data: unknown, success: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [reviewedUpcomingDates, setReviewedUpcomingDates] = useState(false);
  const [reviewedMissingExpenses, setReviewedMissingExpenses] = useState(false);
  const [reviewedSellerOutcomes, setReviewedSellerOutcomes] = useState(false);
  const [priority, setPriority] = useState('');
  const [chosenNextAction, setChosenNextAction] = useState('');
  const [friction, setFriction] = useState('');
  const [sellerSummary, setSellerSummary] = useState<SellerReviewSummary | null>(null);
  const [sellerLoading, setSellerLoading] = useState(false);
  const [sellerRetry, setSellerRetry] = useState(0);
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  const retryKeys = useRef(new Map<string, string>());

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setSellerLoading(true);
    setSellerSummary(null);
    void fetch('/api/realtor/today', { headers: { Accept: 'application/json' }, cache: 'no-store', signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        const summary = sellerReviewSummarySchema.safeParse(payload?.result?.seller?.value);
        if (!controller.signal.aborted) setSellerSummary(summary.success ? summary.data : null);
      })
      .catch(() => { if (!controller.signal.aborted) setSellerSummary(null); })
      .finally(() => { if (!controller.signal.aborted) setSellerLoading(false); });
    return () => controller.abort();
  }, [open, sellerRetry]);

  const complete = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || inFlight.current || !reviewedUpcomingDates || !reviewedMissingExpenses || !reviewedSellerOutcomes || !priority.trim() || !chosenNextAction.trim()) return;
    const payload = {
      action: 'complete', expectedRevision: occurrence.revision,
      completionDetails: { weeklyReview: {
        version: 2, reviewedUpcomingDates: true, reviewedMissingExpenses: true, reviewedSellerOutcomes: true,
        priority: priority.trim(), chosenNextAction: chosenNextAction.trim(), friction: friction.trim() || null,
      } },
    };
    const fingerprint = JSON.stringify([occurrence.id, payload]);
    const requestKey = retryKeys.current.get(fingerprint) || crypto.randomUUID();
    retryKeys.current.set(fingerprint, requestKey);
    inFlight.current = true;
    setSaving(true);
    let saved = false;
    try {
      saved = await submit('/api/realtor/planner/' + occurrence.id, 'PATCH', { ...payload, requestKey },
        'Weekly review completed and counted for this local week.');
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
    if (saved) {
      retryKeys.current.clear();
      setOpen(false);
      setReviewedUpcomingDates(false);
      setReviewedMissingExpenses(false);
      setReviewedSellerOutcomes(false);
      setPriority('');
      setChosenNextAction('');
      setFriction('');
    }
  };

  return <>
    <button type="button" disabled={busy} onClick={() => { setSellerSummary(null); setOpen(true); }} className="rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-50">Review week</button>
    {open ? <ModalSurface labelId="weekly-review-title" onClose={() => setOpen(false)}>
      <h2 id="weekly-review-title" className="text-xl font-bold">Weekly business review</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">For “{occurrence.title_snapshot}” due {occurrence.effective_date}, check the actual work and outcomes. A review counts once per local week.</p>
      <form onSubmit={(event) => { void complete(event); }} className="mt-5 space-y-4">
        <label className="flex items-start gap-3 text-sm text-slate-200"><input type="checkbox" required checked={reviewedUpcomingDates} onChange={(event) => setReviewedUpcomingDates(event.target.checked)} className="mt-0.5 accent-cyan-300" /><span>I reviewed upcoming appointments, follow-ups, and deadlines.</span></label>
        <label className="flex items-start gap-3 text-sm text-slate-200"><input type="checkbox" required checked={reviewedMissingExpenses} onChange={(event) => setReviewedMissingExpenses(event.target.checked)} className="mt-0.5 accent-cyan-300" /><span>I checked for business expenses or bill payments that still need recording.</span></label>
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-300">
          <h3 className="font-semibold text-white">Recorded seller outcomes this week</h3>
          {sellerLoading ? <p role="status" className="mt-1 text-slate-400">Loading recorded seller outcomes…</p>
            : sellerSummary ? <p className="mt-1">{sellerSummary.counts.newRequests} requests · {sellerSummary.counts.customerReplies} replies · {sellerSummary.counts.confirmedConsultations} consultations · {sellerSummary.counts.recordedClosings} closings</p>
              : <div><p role="status" className="mt-1 text-slate-400">Seller outcome counts are not available right now.</p><button type="button" onClick={() => setSellerRetry((value) => value + 1)} className="mt-2 text-cyan-200 underline">Retry seller outcomes</button></div>}
          {sellerSummary?.firstContactTiming ? <p className="mt-1">First contact median: {sellerSummary.firstContactTiming.medianSeconds == null ? 'not enough recorded attempts' : `${Math.round(sellerSummary.firstContactTiming.medianSeconds / 60)} min`} ({sellerSummary.firstContactTiming.sampleSize || 0} requests).</p> : null}
          {sellerSummary?.campaigns?.length ? <ul className="mt-2 space-y-1">{sellerSummary.campaigns.slice(0, 4).map((campaign) => <li key={campaign.campaignKey}>{campaign.campaignKey}: {campaign.requests} requests; {campaign.replyingLeads} replied; {campaign.confirmedConsultations} consultations; {campaign.recordedClosings} closings</li>)}</ul> : null}
          <div className="mt-2 flex gap-3"><a href="/seller-inbox" className="text-cyan-200 hover:underline">Open seller inbox</a><a href="/business" className="text-cyan-200 hover:underline">Check expenses and deposits</a></div>
          <label className="mt-3 flex items-start gap-2"><input type="checkbox" required checked={reviewedSellerOutcomes} onChange={(event) => setReviewedSellerOutcomes(event.target.checked)} className="mt-0.5 accent-cyan-300" /><span>I reviewed the recorded outcome counts and campaign groups.</span></label>
        </section>
        <label className="block text-sm font-medium text-slate-200">My chosen priority for the week<textarea required maxLength={200} value={priority} onChange={(event) => setPriority(event.target.value)} className="mt-1.5 min-h-24 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-cyan-300 focus:outline-none" placeholder="Improve response time to new requests" /></label>
        <label className="block text-sm font-medium text-slate-200">The next action I will take<textarea required maxLength={200} value={chosenNextAction} onChange={(event) => setChosenNextAction(event.target.value)} className="mt-1.5 min-h-20 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-cyan-300 focus:outline-none" placeholder="Call new requests with permission to contact" /></label>
        <label className="block text-sm font-medium text-slate-200">What slowed the work down? <span className="font-normal text-slate-400">(optional)</span><textarea maxLength={500} value={friction} onChange={(event) => setFriction(event.target.value)} className="mt-1.5 min-h-16 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-cyan-300 focus:outline-none" placeholder="Missing photos, delayed reply, or none" /></label>
        <div className="flex gap-2"><button className="rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50" disabled={busy || saving || !reviewedUpcomingDates || !reviewedMissingExpenses || !reviewedSellerOutcomes || !priority.trim() || !chosenNextAction.trim()}>{busy || saving ? 'Saving…' : 'Complete review'}</button><button type="button" disabled={saving} onClick={() => setOpen(false)} className="rounded-lg border border-white/15 px-3 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10">Cancel</button></div>
      </form>
    </ModalSurface> : null}
  </>;
}
