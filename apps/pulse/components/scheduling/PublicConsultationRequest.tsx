'use client';

import React, { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { consultationKinds, consultationRequestContext, consultationRequestReceiptSchema, type ConsultationKind } from '@/lib/scheduling/publicConsultationRequest';

type Phase = 'idle' | 'sending' | 'saved' | 'uncertain' | 'rejected';
type PendingRequest = { key: string; body: string };
const fieldClass = 'mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300';

export function ConsultationRequestForm({ site, kind }: { site: string; kind: ConsultationKind }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const pending = useRef<PendingRequest | null>(null);
  const active = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    active.current?.abort(); active.current = null;
    if (timer.current !== null) clearTimeout(timer.current);
  }, []);

  async function send() {
    if (!pending.current || active.current || phase === 'saved') return;
    const snapshot = pending.current;
    const controller = new AbortController();
    active.current = controller;
    setPhase('sending');
    const deadline = setTimeout(() => {
      if (active.current === controller) {
        controller.abort(); active.current = null; setPhase('uncertain');
      }
    }, 20000);
    timer.current = deadline;
    try {
      const response = await fetch('/api/sites/leads', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': snapshot.key },
        body: snapshot.body, signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (!response.ok && [400, 401, 403, 404, 413, 415, 422, 429].includes(response.status)) {
        pending.current = null;
        setPhase('rejected');
        return;
      }
      const receipt = response.ok ? consultationRequestReceiptSchema.safeParse(await response.json()) : null;
      if (controller.signal.aborted) return;
      if (receipt?.success) {
        pending.current = null;
        setPhase('saved');
      } else setPhase('uncertain');
    } catch {
      if (!controller.signal.aborted) setPhase('uncertain');
    } finally {
      clearTimeout(deadline);
      if (timer.current === deadline) timer.current = null;
      if (active.current === controller) active.current = null;
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (active.current || phase === 'saved' || phase === 'uncertain' || !consent) return;
    pending.current = {
      key: `consultation:${crypto.randomUUID()}`,
      body: JSON.stringify({
        agentId: site, site, name: name.trim(), email: email.trim(),
        message: `${consultationKinds[kind]} request.\nContact permission: You may contact me by email about this consultation request.${message.trim() ? `\n\n${message.trim()}` : ''}`,
        source: 'agent_site', pagePath: '/schedule', preferredContact: 'email', consent: true,
      }),
    };
    void send();
  }

  if (phase === 'saved') return <section className="space-y-4 rounded-2xl border border-teal-200/25 p-6" aria-label="Saved consultation request">
    <h2 className="text-xl uppercase">Request Saved</h2>
    <p role="status">Your consultation request was saved. A time has not been booked.</p>
    <p className="text-sm text-slate-300">You can close this page. The request is available for your agent to review.</p>
    <Link href="/properties" className="inline-flex min-h-11 items-center text-cyan-200 underline">Browse Properties</Link>
  </section>;

  return <form onSubmit={submit} className="space-y-5 rounded-2xl border border-white/15 p-6">
    <p className="text-sm text-slate-300">{consultationKinds[kind]}. Send a request to your agent to arrange a time. This form does not reserve a calendar slot.</p>
    <fieldset disabled={phase === 'sending' || phase === 'uncertain'} className="space-y-5 disabled:opacity-70">
      <legend className="sr-only">Consultation Request Details</legend>
      <label htmlFor="consultation-name" className="block">Name<input id="consultation-name" required minLength={2} maxLength={120} autoComplete="name" value={name} onChange={event => setName(event.target.value)} className={fieldClass} /></label>
      <label htmlFor="consultation-email" className="block">Email<input id="consultation-email" required type="email" maxLength={180} autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className={fieldClass} /></label>
      <label htmlFor="consultation-message" className="block">What Would You Like to Discuss? <span className="text-sm text-slate-400">Optional</span><textarea id="consultation-message" maxLength={1500} rows={4} value={message} onChange={event => setMessage(event.target.value)} className={fieldClass} /></label>
      <label className="flex items-start gap-3"><input required type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} className="mt-1 h-5 w-5" /><span>You may contact me by email about this consultation request.</span></label>
      <button disabled={!consent} className="min-h-11 w-full rounded-lg bg-cyan-300 px-5 py-3 font-semibold text-slate-950 disabled:opacity-50">Send Request</button>
    </fieldset>
    {phase === 'sending' && <p role="status">Saving your request…</p>}
    {phase === 'rejected' && <p role="alert">The request was not accepted. Check your details and agent link, then try again. If you have sent several requests, wait a few minutes.</p>}
    {phase === 'uncertain' && <div className="space-y-3" role="alert"><p>We could not verify whether your request was saved. Retry the same request to check. A time has not been booked.</p><button type="button" className="min-h-11 rounded-lg border border-cyan-200 px-4 py-2" onClick={() => void send()}>Retry Request</button></div>}
  </form>;
}

export function PublicConsultationRequest() {
  const params = useSearchParams();
  const context = consultationRequestContext(params);
  return <main className="min-h-screen bg-slate-950 px-5 py-12 text-slate-100"><div className="mx-auto max-w-xl space-y-6">
    <h1 className="text-3xl uppercase">Request a Consultation</h1>
    {context ? <ConsultationRequestForm key={`${context.site}:${context.kind}`} {...context} /> : <div className="space-y-4"><p role="alert">Open the consultation link from your agent’s site to send a request.</p><Link href="/contact" className="inline-flex min-h-11 items-center text-cyan-200 underline">Contact Sunset Pulse</Link></div>}
  </div></main>;
}
