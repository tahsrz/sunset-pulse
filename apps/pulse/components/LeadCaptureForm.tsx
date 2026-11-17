'use client';

import { useState, type FormEvent } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { FALLBACK_AGENT_ID } from '@/lib/sites/agentConfig';
import { getAgentSiteSubdomain } from '@/lib/sites/siteUrls';

const fieldClass = 'min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:border-[#275e60] focus:ring-2 focus:ring-[#275e60]/30';

export default function LeadCaptureForm({ propertyId, propertyName, kind = 'inquiry' }: {
  propertyId: string;
  propertyName: string;
  kind?: 'inquiry' | 'showing';
}) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');
  const isShowing = kind === 'showing';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'sending') return;
    setStatus('sending');
    setError('');
    const form = new FormData(event.currentTarget);
    const question = String(form.get('message') || '').trim();

    try {
      const response = await fetch('/api/sites/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: FALLBACK_AGENT_ID,
          site: getAgentSiteSubdomain(),
          source: 'pulse_listing_inquiry',
          requestKind: kind,
          listing: { id: propertyId },
          name: String(form.get('name') || '').trim(),
          email: String(form.get('email') || '').trim(),
          phone: String(form.get('phone') || '').trim(),
          preferredContact: 'email',
          message: question || (isShowing ? 'I would like to request a showing.' : 'I would like more information about this listing.'),
          company: String(form.get('company') || ''),
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.data?.accepted !== true) {
        throw new Error(result?.message || 'Your request could not be sent. Please try again.');
      }
      setStatus('sent');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Your request could not be sent. Please try again.');
      setStatus('idle');
    }
  }

  if (status === 'sent') {
    return (
      <div role="status" className="rounded-xl border border-[#c4dddd] bg-[#edf8f7] px-4 py-5 text-sm text-slate-700">
        <p className="flex items-center gap-2 font-semibold text-[#245757]">
          <CheckCircle2 size={18} aria-hidden="true" /> {isShowing ? 'Showing request sent' : 'Inquiry received'}
        </p>
        <p className="mt-2 leading-6">A Pulse agent can follow up with you about {propertyName} by email.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <label className="block space-y-1 text-sm font-medium text-slate-700">
        <span>Full name</span>
        <input name="name" autoComplete="name" required minLength={2} maxLength={120} className={fieldClass} />
      </label>
      <label className="block space-y-1 text-sm font-medium text-slate-700">
        <span>Email</span>
        <input name="email" type="email" autoComplete="email" required maxLength={180} className={fieldClass} />
      </label>
      <label className="block space-y-1 text-sm font-medium text-slate-700">
        <span>Phone <span className="font-normal text-slate-500">(optional)</span></span>
        <input name="phone" type="tel" autoComplete="tel" maxLength={40} className={fieldClass} />
      </label>
      <label className="block space-y-1 text-sm font-medium text-slate-700">
        <span>{isShowing ? 'Preferred times or questions' : 'Your question'} <span className="font-normal text-slate-500">(optional)</span></span>
        <textarea name="message" rows={3} minLength={5} maxLength={2000} className={`${fieldClass} resize-y`} />
      </label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={status === 'sending'}
        className="min-h-11 w-full rounded-lg bg-[#275e60] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1b4749] disabled:cursor-wait disabled:opacity-70"
      >
        {status === 'sending' ? 'Sending…' : isShowing ? 'Send showing request' : 'Send inquiry'}
      </button>
    </form>
  );
}
