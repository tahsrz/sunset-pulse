'use client';

import React, { useEffect, useRef, useState, type FormEvent } from 'react';
import { sellerBookingOfferSchema, type SellerBookingOffer } from '@/lib/scheduling/sellerConsultationContract';
import SellerConsultationPicker from './SellerConsultationPicker';

type SubmissionState = 'idle' | 'submitting' | 'success' | 'error';
type Step = 'help' | 'timing' | 'contact';
type RequestKind = 'seller_plan' | 'pricing_review';
type LeadResponse = { success?: boolean; message?: string; duplicate?: boolean; bookingOffer?: unknown };
type Draft = {
  requestKind: RequestKind;
  timing: string;
  name: string;
  email: string;
  requestedContact: boolean;
  marketingOptIn: boolean;
  company: string;
};

const initialDraft: Draft = {
  requestKind: 'seller_plan', timing: 'exploring', name: '', email: '',
  requestedContact: false, marketingOptIn: false, company: '',
};
const stepOrder: Step[] = ['help', 'timing', 'contact'];
const stepLabels: Record<Step, string> = { help: 'What do you need?', timing: 'When are you thinking?', contact: 'How can we reach you?' };
const fieldClass = 'mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-slate-950/80 px-4 text-base text-white focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-300/30';

export default function SellerPlanRequestForm({ initialRequestKind = 'seller_plan' }: { initialRequestKind?: RequestKind }) {
  const [step, setStep] = useState<Step>('help');
  const [draft, setDraft] = useState<Draft>(() => ({ ...initialDraft, requestKind: initialRequestKind }));
  const [state, setState] = useState<SubmissionState>('idle');
  const [feedback, setFeedback] = useState('');
  const [bookingOffer, setBookingOffer] = useState<SellerBookingOffer | null>(null);
  const submitting = useRef(false);
  const lastSubmission = useRef<{ fingerprint: string; submissionId: string } | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const currentStep = stepOrder.indexOf(step);

  useEffect(() => {
    if (currentStep > 0) headingRef.current?.focus();
  }, [currentStep]);

  useEffect(() => {
    if (state === 'success') headingRef.current?.focus();
  }, [state]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    if (state === 'error') setState('idle');
  }

  function goTo(next: Step) {
    setFeedback('');
    setStep(next);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || step !== 'contact' || !draft.requestedContact) return;
    submitting.current = true;
    const search = new URL(window.location.href).searchParams;
    const requestFields = {
      offerKey: 'keller-westlake-seller-plan',
      offerVersion: '2',
      name: draft.name,
      email: draft.email,
      requestKind: draft.requestKind,
      timing: draft.timing,
      requestedContact: draft.requestedContact,
      marketingOptIn: draft.marketingOptIn,
      company: draft.company,
      campaign: {
        source: search.get('utm_source'), medium: search.get('utm_medium'),
        campaign: search.get('utm_campaign'), content: search.get('utm_content'),
      },
    };
    const fingerprint = JSON.stringify(requestFields);
    if (lastSubmission.current?.fingerprint !== fingerprint) {
      lastSubmission.current = { fingerprint, submissionId: globalThis.crypto.randomUUID() };
    }
    setState('submitting');
    setFeedback('');

    try {
      const response = await fetch('/api/lead-magnets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...requestFields, submissionId: lastSubmission.current.submissionId }),
      });
      const result = (await response.json()) as LeadResponse;
      if (!response.ok || result.success !== true) throw new Error(result.message || 'We could not save your request. Please try again.');
      const offer = sellerBookingOfferSchema.safeParse(result.bookingOffer);
      setBookingOffer(offer.success ? offer.data : null);
      setState('success');
      setFeedback('Your request is saved. We will follow up about what you selected.');
      lastSubmission.current = null;
    } catch (error) {
      setState('error');
      setFeedback(error instanceof Error ? error.message : 'We could not save your request. Please try again.');
    } finally { submitting.current = false; }
  }

  if (state === 'success') {
    return (
      <section tabIndex={-1} ref={headingRef} aria-labelledby="seller-request-saved" className="rounded-2xl border border-teal-200/20 bg-teal-200/[0.06] p-6 focus:outline-none focus:ring-2 focus:ring-teal-200">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-200">Request saved</p>
        <h3 id="seller-request-saved" className="mt-3 text-2xl font-bold text-white">Thanks, {draft.name}.</h3>
        <p role="status" className="mt-3 text-sm leading-6 text-slate-300">{feedback}</p>
        {bookingOffer ? <SellerConsultationPicker offer={bookingOffer} /> : <p className="mt-3 text-sm leading-6 text-slate-400">This sends a request for a conversation. It does not book an appointment.</p>}
      </section>
    );
  }

  return (
    <form id="request" onSubmit={handleSubmit} className="space-y-6" aria-describedby="seller-plan-privacy">
      <ol className="grid grid-cols-3 gap-2" aria-label="Seller request steps">
        {stepOrder.map((item, index) => (
          <li key={item} className={`rounded-xl border px-3 py-3 text-center text-xs font-bold ${index <= currentStep ? 'border-teal-200/30 bg-teal-200/10 text-teal-50' : 'border-white/10 text-slate-500'}`} aria-current={step === item ? 'step' : undefined}>
            <span className="block text-[10px] uppercase tracking-wider">Step {index + 1}</span>{stepLabels[item]}
          </li>
        ))}
      </ol>

      <section aria-labelledby="seller-request-step-title">
        <h3 ref={headingRef} id="seller-request-step-title" tabIndex={-1} className="text-xl font-bold text-white focus:outline-none">{stepLabels[step]}</h3>
        {step === 'help' ? (
          <fieldset className="mt-4 space-y-3">
            <legend className="sr-only">Choose what you would like help with</legend>
            <ChoiceCard name="requestKind" value="seller_plan" checked={draft.requestKind === 'seller_plan'} onChange={() => update('requestKind', 'seller_plan')} title="A plan to get ready to sell" description="Talk through timing, preparation and next steps." />
            <ChoiceCard name="requestKind" value="pricing_review" checked={draft.requestKind === 'pricing_review'} onChange={() => update('requestKind', 'pricing_review')} title="A pricing review" description="Request a conversation about a property-specific price review." />
          </fieldset>
        ) : null}

        {step === 'timing' ? (
          <fieldset className="mt-4 space-y-3">
            <legend className="sr-only">Choose when you might sell</legend>
            {[
              ['exploring', 'I’m still exploring'], ['within-30-days', 'Within 30 days'],
              ['one-to-three-months', 'In 1–3 months'], ['three-to-six-months', 'In 3–6 months'], ['later', 'Later this year or beyond'],
            ].map(([value, label]) => <ChoiceCard key={value} name="timing" value={value} checked={draft.timing === value} onChange={() => update('timing', value)} title={label} />)}
          </fieldset>
        ) : null}

        {step === 'contact' ? (
          <div className="mt-4 space-y-4">
            <label className="block text-sm font-semibold text-slate-100">Your name<input autoComplete="name" name="name" required minLength={2} maxLength={120} value={draft.name} onChange={(event) => update('name', event.target.value)} className={fieldClass} /></label>
            <label className="block text-sm font-semibold text-slate-100">Email<input autoComplete="email" type="email" name="email" required maxLength={180} value={draft.email} onChange={(event) => update('email', event.target.value)} className={fieldClass} /></label>
            <label className="flex items-start gap-3 text-sm leading-6 text-slate-300"><input name="requestedContact" type="checkbox" required checked={draft.requestedContact} onChange={(event) => update('requestedContact', event.target.checked)} className="mt-1 size-4 accent-teal-400" /><span>I agree to be contacted to respond to this request.</span></label>
            <label className="flex items-start gap-3 text-sm leading-6 text-slate-400"><input name="marketingOptIn" type="checkbox" checked={draft.marketingOptIn} onChange={(event) => update('marketingOptIn', event.target.checked)} className="mt-1 size-4 accent-teal-400" /><span>Send me occasional local real-estate updates. Optional; I can unsubscribe anytime.</span></label>
          </div>
        ) : null}
      </section>

      <label aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">Leave this field empty<input name="company" tabIndex={-1} autoComplete="off" value={draft.company} onChange={(event) => update('company', event.target.value)} /></label>
      <p id="seller-plan-privacy" className="text-xs leading-5 text-slate-400">We use these details to respond to your request. Do not include a street address or private property documents here. A request does not subscribe you to marketing unless you separately check that box.</p>
      {state === 'error' ? <p role="alert" className="text-sm text-rose-300">{feedback}</p> : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        {step === 'help' ? <span /> : <button type="button" onClick={() => goTo(stepOrder[currentStep - 1])} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/15 px-5 font-bold text-white hover:bg-white/5">Back</button>}
        {step !== 'contact' ? (
          <button type="button" onClick={() => goTo(stepOrder[currentStep + 1])} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-teal-400 px-5 font-black text-slate-950 transition hover:bg-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">Continue</button>
        ) : (
          <button type="submit" disabled={state === 'submitting'} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-teal-400 px-5 font-black text-slate-950 transition hover:bg-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-wait disabled:opacity-60">{state === 'submitting' ? 'Saving your request…' : 'Send Request'}</button>
        )}
      </div>
    </form>
  );
}

function ChoiceCard({ name, value, checked, onChange, title, description }: { name: string; value: string; checked: boolean; onChange: () => void; title: string; description?: string }) {
  return (
    <label className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border p-4 transition focus-within:ring-2 focus-within:ring-teal-200 ${checked ? 'border-teal-200/50 bg-teal-200/[0.08]' : 'border-white/10 bg-white/[0.025] hover:bg-white/[0.05]'}`}>
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="mt-1 size-4 accent-teal-400" />
      <span><span className="block text-sm font-bold text-white">{title}</span>{description ? <span className="mt-1 block text-sm leading-5 text-slate-300">{description}</span> : null}</span>
    </label>
  );
}
