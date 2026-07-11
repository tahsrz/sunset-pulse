'use client';

import { FormEvent, useState } from 'react';
import { CheckCircle2, Loader2, Mail, Send, ShieldCheck } from 'lucide-react';

type LeadListingContext = {
  id?: string;
  mlsId?: string;
  name?: string;
};

type AgentLeadFormProps = {
  agentId: string;
  site: string;
  siteName: string;
  agentName: string;
  primaryColor: string;
  source: 'agent_site_contact' | 'agent_site_listing';
  listing?: LeadListingContext;
  defaultMessage?: string;
  compact?: boolean;
};

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

export default function AgentLeadForm({
  agentId,
  site,
  siteName,
  agentName,
  primaryColor,
  source,
  listing,
  defaultMessage,
  compact = false,
}: AgentLeadFormProps) {
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitState('submitting');
    setErrorMessage('');

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      agentId,
      site,
      siteName,
      source,
      listing,
      pagePath: typeof window !== 'undefined' ? window.location.pathname : undefined,
      name: String(formData.get('name') || ''),
      email: String(formData.get('email') || ''),
      phone: String(formData.get('phone') || ''),
      preferredContact: String(formData.get('preferredContact') || 'either'),
      message: String(formData.get('message') || ''),
      company: String(formData.get('company') || ''),
    };

    try {
      const response = await fetch('/api/sites/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.message || 'Unable to send your message right now.');
      }

      form.reset();
      setSubmitState('success');
    } catch (error: any) {
      setSubmitState('error');
      setErrorMessage(error?.message || 'Unable to send your message right now.');
    }
  };

  if (submitState === 'success') {
    return (
      <div className="rounded-3xl border border-emerald-400/25 bg-emerald-400/10 p-5 text-center">
        <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-300" />
        <p className="mt-3 text-lg font-black text-white">Message sent.</p>
        <p className="mt-2 text-sm leading-6 text-emerald-50/75">
          {agentName} has the inquiry context and can follow up from here.
        </p>
        <button
          type="button"
          onClick={() => setSubmitState('idle')}
          className="mt-4 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-white/15"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-white/10 bg-slate-950/55 p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10" style={{ color: primaryColor }}>
          <Mail size={18} />
        </span>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/50">
            {listing ? 'Ask about this home' : 'Contact the agent'}
          </p>
          <h3 className="mt-1 text-xl font-black text-white">
            Send {agentName} a note
          </h3>
        </div>
      </div>

      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      <div className={compact ? 'grid gap-3' : 'grid gap-3 sm:grid-cols-2'}>
        <LeadInput name="name" label="Name" autoComplete="name" required />
        <LeadInput name="email" label="Email" type="email" autoComplete="email" required />
        <LeadInput name="phone" label="Phone" type="tel" autoComplete="tel" />
        <label className="block">
          <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/45">Preferred Contact</span>
          <select
            name="preferredContact"
            defaultValue="either"
            className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-cyan-300/70"
          >
            <option value="either">Either</option>
            <option value="email">Email</option>
            <option value="phone">Phone</option>
          </select>
        </label>
      </div>

      <label className="mt-3 block">
        <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/45">Message</span>
        <textarea
          name="message"
          required
          minLength={5}
          maxLength={2000}
          defaultValue={defaultMessage}
          rows={compact ? 4 : 5}
          className="w-full resize-y rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/70"
          placeholder={listing ? 'I would like more information or a showing.' : 'Tell us what kind of home you are looking for.'}
        />
      </label>

      {errorMessage ? (
        <p className="mt-3 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-100">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitState === 'submitting'}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-slate-950 transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60"
        style={{ backgroundColor: primaryColor }}
      >
        {submitState === 'submitting' ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
        {submitState === 'submitting' ? 'Sending...' : 'Send Inquiry'}
      </button>

      <p className="mt-3 flex items-start gap-2 text-[11px] leading-5 text-slate-400">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: primaryColor }} />
        This sends your inquiry to the agent profile for {siteName}; it does not expose your note publicly.
      </p>
    </form>
  );
}

function LeadInput({
  name,
  label,
  type = 'text',
  autoComplete,
  required = false,
}: {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/45">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/70"
      />
    </label>
  );
}
