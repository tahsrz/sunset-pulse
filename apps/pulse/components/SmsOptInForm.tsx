'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, MessageSquareText, ShieldCheck } from 'lucide-react';
import { SMS_OPT_IN_USE_CASES, SmsOptInUseCaseId } from '@/lib/sms/consent';

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

const initialUseCases = SMS_OPT_IN_USE_CASES.reduce(
  (acc, useCase) => ({ ...acc, [useCase.id]: false }),
  {} as Record<SmsOptInUseCaseId, boolean>
);

type SmsOptInFormProps = {
  useCaseId?: SmsOptInUseCaseId;
  pagePath?: string;
  source?: string;
};

export default function SmsOptInForm({ useCaseId, pagePath = '/sms-opt-in', source = 'sms-opt-in-webform' }: SmsOptInFormProps) {
  const visibleUseCases = useCaseId
    ? SMS_OPT_IN_USE_CASES.filter((useCase) => useCase.id === useCaseId)
    : SMS_OPT_IN_USE_CASES;
  const lockedUseCase = visibleUseCases.length === 1 ? visibleUseCases[0] : null;
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    useCases: initialUseCases,
  });

  const selectedCount = Object.values(formData.useCases).filter(Boolean).length;

  const updateField = (field: 'name' | 'email' | 'phone', value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
    if (submitState === 'error') {
      setSubmitState('idle');
      setMessage('');
    }
  };

  const updateUseCase = (id: SmsOptInUseCaseId, checked: boolean) => {
    setFormData((current) => ({
      ...current,
      useCases: {
        ...current.useCases,
        [id]: checked,
      },
    }));
    if (submitState === 'error') {
      setSubmitState('idle');
      setMessage('');
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitState('submitting');
    setMessage('');

    try {
      const response = await fetch('/api/sms/opt-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          page: pagePath,
          source,
        }),
      });
      const payload = await response.json();

      if (!response.ok || payload?.error) {
        throw new Error(payload?.details?.phone?.[0] || payload?.details?.useCases?.[0] || payload?.message || 'Opt-in failed.');
      }

      setSubmitState('success');
      setMessage('Your selected SMS opt-ins are recorded. You can reply STOP to any text message to unsubscribe.');
      setFormData({ name: '', email: '', phone: '', useCases: initialUseCases });
    } catch (error: any) {
      setSubmitState('error');
      setMessage(error?.message || 'Could not record your opt-in. Please try again.');
    }
  };

  if (submitState === 'success') {
    return (
      <div className="border border-emerald-200/25 bg-emerald-950/35 p-6 text-center shadow-2xl sm:p-8">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-300" />
        <h2 className="mt-4 text-2xl font-black uppercase tracking-tight text-white">Opt-In Recorded</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-emerald-50/80">{message}</p>
        <button
          type="button"
          onClick={() => {
            setSubmitState('idle');
            setMessage('');
          }}
          className="mt-6 inline-flex items-center justify-center rounded-md bg-emerald-300 px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-slate-950 transition hover:bg-emerald-200"
        >
          Add Another Number
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border border-white/10 bg-slate-950/80 p-5 shadow-2xl sm:p-7">
      <div className="flex items-start gap-3 border-b border-white/10 pb-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-cyan-300 text-slate-950">
          <MessageSquareText className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">Business SMS Opt-In</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {lockedUseCase
              ? `Opt in to ${lockedUseCase.label.toLowerCase()} text messages from ${lockedUseCase.endBusiness}.`
              : 'Choose exactly which business and message type this phone number may receive texts from.'}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        <div>
          <label htmlFor="sms-opt-name" className="text-xs font-black uppercase tracking-[0.14em] text-slate-300">
            Name
          </label>
          <input
            id="sms-opt-name"
            type="text"
            value={formData.name}
            onChange={(event) => updateField('name', event.target.value)}
            className="mt-2 w-full rounded-md border border-white/10 bg-white px-3 py-3 text-sm text-slate-950 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
            placeholder="Your name"
            autoComplete="name"
            disabled={submitState === 'submitting'}
          />
        </div>

        <div>
          <label htmlFor="sms-opt-phone" className="text-xs font-black uppercase tracking-[0.14em] text-slate-300">
            Mobile Phone *
          </label>
          <input
            id="sms-opt-phone"
            type="tel"
            required
            value={formData.phone}
            onChange={(event) => updateField('phone', event.target.value)}
            className="mt-2 w-full rounded-md border border-white/10 bg-white px-3 py-3 text-sm text-slate-950 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
            placeholder="(817) 555-0123"
            autoComplete="tel"
            disabled={submitState === 'submitting'}
          />
        </div>

        <div>
          <label htmlFor="sms-opt-email" className="text-xs font-black uppercase tracking-[0.14em] text-slate-300">
            Email
          </label>
          <input
            id="sms-opt-email"
            type="email"
            value={formData.email}
            onChange={(event) => updateField('email', event.target.value)}
            className="mt-2 w-full rounded-md border border-white/10 bg-white px-3 py-3 text-sm text-slate-950 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
            placeholder="you@example.com"
            autoComplete="email"
            disabled={submitState === 'submitting'}
          />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-300">
            {lockedUseCase ? 'Required SMS Consent *' : 'Separate Business SMS Opt-Ins *'}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            {lockedUseCase
              ? 'Confirm this single end business and message type.'
              : 'Select each end business and message type independently.'}
          </p>
        </div>
        {visibleUseCases.map((useCase) => (
          <label key={useCase.id} className="flex gap-3 rounded-md border border-cyan-200/20 bg-cyan-950/30 p-4 text-sm leading-6 text-cyan-50/85">
            <input
              type="checkbox"
              checked={formData.useCases[useCase.id]}
              onChange={(event) => updateUseCase(useCase.id, event.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded border-white/20 text-cyan-400 focus:ring-cyan-300"
              disabled={submitState === 'submitting'}
            />
            <span>
              <span className="block text-xs font-black uppercase tracking-[0.14em] text-emerald-200">{useCase.endBusiness}</span>
              <span className="block font-black uppercase tracking-[0.12em] text-cyan-100">{useCase.label}</span>
              <span className="mt-1 block text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{useCase.category}</span>
              <span className="mt-2 block text-slate-300">{useCase.description}</span>
              <span className="mt-2 block">{useCase.consentText}</span>
            </span>
          </label>
        ))}
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-md border border-white/10 bg-white/[0.04] p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
        <p className="text-xs leading-5 text-slate-300">
          Your consent record stores each selected message type, exact consent language, phone number, submission time, source page, IP address, and browser user agent for audit purposes.
        </p>
      </div>

      {message && (
        <p className={`mt-4 text-sm font-bold ${submitState === 'error' ? 'text-rose-300' : 'text-emerald-300'}`}>
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={submitState === 'submitting' || selectedCount === 0}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-cyan-300 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitState === 'submitting' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        {submitState === 'submitting' ? 'Recording' : 'Opt In To Texts'}
      </button>
    </form>
  );
}
