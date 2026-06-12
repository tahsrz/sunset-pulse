'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, MessageSquareText, ShieldCheck } from 'lucide-react';

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

const consentText =
  'I agree to receive recurring automated SMS/text messages from Sunset Pulse about property updates, scheduling, grill/order updates, and local offers at the phone number provided. Message frequency varies. Message and data rates may apply. Reply STOP to unsubscribe and HELP for help. Consent is not a condition of purchase.';

export default function SmsOptInForm() {
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    consent: false,
  });

  const updateField = (field: keyof typeof formData, value: string | boolean) => {
    setFormData((current) => ({ ...current, [field]: value }));
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
          source: 'sms-opt-in-webform',
        }),
      });
      const payload = await response.json();

      if (!response.ok || payload?.error) {
        throw new Error(payload?.details?.phone?.[0] || payload?.details?.consent?.[0] || payload?.message || 'Opt-in failed.');
      }

      setSubmitState('success');
      setMessage('You are opted in. You can reply STOP to any text message to unsubscribe.');
      setFormData({ name: '', email: '', phone: '', consent: false });
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
          <h1 className="text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">SMS Opt-In</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Join Sunset Pulse text updates for property alerts, scheduling updates, order notices, and local offers.
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

      <label className="mt-5 flex gap-3 rounded-md border border-cyan-200/20 bg-cyan-950/30 p-4 text-sm leading-6 text-cyan-50/85">
        <input
          type="checkbox"
          checked={formData.consent}
          onChange={(event) => updateField('consent', event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 rounded border-white/20 text-cyan-400 focus:ring-cyan-300"
          required
          disabled={submitState === 'submitting'}
        />
        <span>{consentText}</span>
      </label>

      <div className="mt-5 flex items-start gap-3 rounded-md border border-white/10 bg-white/[0.04] p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
        <p className="text-xs leading-5 text-slate-300">
          Your consent record stores the exact language above, phone number, submission time, source page, IP address, and browser user agent for audit purposes.
        </p>
      </div>

      {message && (
        <p className={`mt-4 text-sm font-bold ${submitState === 'error' ? 'text-rose-300' : 'text-emerald-300'}`}>
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={submitState === 'submitting'}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-cyan-300 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitState === 'submitting' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        {submitState === 'submitting' ? 'Recording' : 'Opt In To Texts'}
      </button>
    </form>
  );
}
