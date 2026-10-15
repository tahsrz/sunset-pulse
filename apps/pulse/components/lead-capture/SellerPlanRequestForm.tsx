'use client';

import React, { useRef, useState, type FormEvent } from 'react';

type SubmissionState = 'idle' | 'submitting' | 'success' | 'error';
type LeadResponse = { success?: boolean; message?: string; duplicate?: boolean };

export default function SellerPlanRequestForm() {
  const [state, setState] = useState<SubmissionState>('idle');
  const lastSubmission = useRef<{ fingerprint: string; submissionId: string } | null>(null);
  const [feedback, setFeedback] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const search = new URL(window.location.href).searchParams;
    const requestFields = {
      offerKey: 'keller-westlake-seller-plan',
      offerVersion: '2',
      name: values.get('name'),
      email: values.get('email'),
      requestKind: values.get('requestKind'),
      timing: values.get('timing'),
      requestedContact: values.get('requestedContact') === 'on',
      marketingOptIn: values.get('marketingOptIn') === 'on',
      company: values.get('company'),
      campaign: {
        source: search.get('utm_source'),
        medium: search.get('utm_medium'),
        campaign: search.get('utm_campaign'),
        content: search.get('utm_content'),
      },
    };
    // Preserve one request identity after uncertain delivery, but never reuse it
    // when the visitor edits the details after a failure.
    const fingerprint = JSON.stringify(requestFields);
    if (lastSubmission.current?.fingerprint !== fingerprint) {
      lastSubmission.current = { fingerprint, submissionId: globalThis.crypto.randomUUID() };
    }
    setState('submitting');
    setFeedback('');

    try {
      const response = await fetch('/api/lead-magnets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...requestFields,
          submissionId: lastSubmission.current!.submissionId,
        }),
      });
      const result = (await response.json()) as LeadResponse;
      if (!response.ok || result.success !== true) throw new Error(result.message || 'We could not save your request. Please try again.');

      setState('success');
      setFeedback('Your request is saved. We will follow up about what you selected.');
      lastSubmission.current = null;
      form.reset();
    } catch (error) {
      setState('error');
      setFeedback(error instanceof Error ? error.message : 'We could not save your request. Please try again.');
    }
  }

  return (
    <form id="request" onSubmit={handleSubmit} className="space-y-5" aria-describedby="seller-plan-privacy">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-100">Your name
          <input autoComplete="name" name="name" required maxLength={120} className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-slate-950/80 px-4 text-base text-white focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-300/30" />
        </label>
        <label className="block text-sm font-semibold text-slate-100">Email
          <input autoComplete="email" type="email" name="email" required maxLength={180} className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-slate-950/80 px-4 text-base text-white focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-300/30" />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-100">What would you like help with?
          <select name="requestKind" defaultValue="seller_plan" className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-slate-950/80 px-4 text-base text-white focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-300/30">
            <option value="seller_plan">A seller preparation and timing plan</option>
            <option value="pricing_review">A personally reviewed pricing / CMA conversation</option>
          </select>
        </label>
        <label className="block text-sm font-semibold text-slate-100">When might you sell?
          <select name="timing" defaultValue="exploring" className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-slate-950/80 px-4 text-base text-white focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-300/30">
            <option value="exploring">I’m still exploring</option><option value="within-30-days">Within 30 days</option><option value="one-to-three-months">1–3 months</option><option value="three-to-six-months">3–6 months</option><option value="later">Later this year or beyond</option>
          </select>
        </label>
      </div>

      <label className="flex items-start gap-3 text-sm leading-6 text-slate-300"><input name="requestedContact" type="checkbox" required className="mt-1 size-4 accent-teal-400" /><span>I agree to be contacted to respond to this seller-plan request.</span></label>
      <label className="flex items-start gap-3 text-sm leading-6 text-slate-400"><input name="marketingOptIn" type="checkbox" className="mt-1 size-4 accent-teal-400" /><span>Send me occasional local real-estate updates. Optional; I can unsubscribe anytime.</span></label>

      <label aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">Leave this field empty<input name="company" tabIndex={-1} autoComplete="off" /></label>
      <p id="seller-plan-privacy" className="text-xs leading-5 text-slate-400">We use these details to respond to your request. Do not include a street address or private property documents here; we will discuss property details directly if needed. A request does not subscribe you to marketing unless you separately check that box.</p>
      <button type="submit" disabled={state === 'submitting'} className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-teal-400 px-5 py-3 font-black text-slate-950 transition hover:bg-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-wait disabled:opacity-60 sm:w-auto sm:min-w-64">
        {state === 'submitting' ? 'Saving your request…' : 'Request my seller plan'}
      </button>
      <p role="status" aria-live="polite" className={state === 'error' ? 'text-sm text-rose-300' : 'text-sm text-teal-200'}>{feedback}</p>
    </form>
  );
}
