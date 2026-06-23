'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { FaCheckCircle, FaMicrophone, FaPhoneAlt, FaSave, FaShieldAlt } from 'react-icons/fa';
import { analyzeCallAssist } from '@/lib/call-assist/analyzer';

const demoTranscript = [
  'Caller: I like the house, but the price feels a little high.',
  'Agent: Are you thinking about monthly payment or total price?',
  'Caller: Monthly payment. We are preapproved, but I need to talk it over with my wife.',
  'Agent: Would seeing it tomorrow help you decide?',
  'Caller: Tomorrow could work if the payment range makes sense.'
].join('\n');

const demoContext = {
  callerName: 'Morgan Demo Lead',
  leadStage: 'Hot buyer inquiry',
  propertyAddress: '101 S. Council, Sunset, TX',
  propertyPrice: 525000,
  budget: 500000,
  timeframe: 'Tour tomorrow',
  financingStatus: 'Preapproved',
};

const steps = [
  { id: 'consent', label: 'Consent', icon: <FaShieldAlt /> },
  { id: 'bridge', label: 'Bridge', icon: <FaPhoneAlt /> },
  { id: 'listen', label: 'Assist', icon: <FaMicrophone /> },
  { id: 'save', label: 'Save', icon: <FaSave /> },
];

export default function CallAssistDemo() {
  const [activeStep, setActiveStep] = useState('listen');
  const analysis = useMemo(() => analyzeCallAssist({
    transcript: demoTranscript,
    context: demoContext,
    consent: { disclosureRead: true, callerConsented: true, recordingAllowed: true },
  }), []);

  return (
    <div className="grid gap-8 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-5">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
            <FaPhoneAlt />
            Jamie Call Assist
          </div>
          <h3 className="text-4xl font-black uppercase italic text-white">Consent to memory in one call.</h3>
          <p className="mt-5 text-sm font-medium leading-7 text-slate-400">
            The demo path captures consent, starts a safe bridge, listens for buying signals, and writes a follow-up memory patch back to the lead.
          </p>
        </div>

        <div className="grid gap-3">
          {steps.map((step, index) => (
            <button
              key={step.id}
              type="button"
              onClick={() => setActiveStep(step.id)}
              className={`flex items-center justify-between rounded-2xl border px-4 py-4 text-left transition ${
                activeStep === step.id
                  ? 'border-cyan-300/40 bg-cyan-400/15 text-cyan-50'
                  : 'border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.08]'
              }`}
            >
              <span className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.16em]">
                {step.icon}
                {step.label}
              </span>
              <span className="font-mono text-xs">{String(index + 1).padStart(2, '0')}</span>
            </button>
          ))}
        </div>

        <Link
          href="/call-assist?demo=1"
          className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-cyan-300 px-6 py-4 text-xs font-black uppercase tracking-[0.18em] text-slate-950 transition hover:bg-cyan-200"
        >
          Open Guided Console
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-3xl border border-white/10 bg-black/30 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200/70">Live transcript</p>
              <h4 className="mt-2 text-2xl font-black text-white">{demoContext.callerName}</h4>
            </div>
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-right">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-100/70">Intent</p>
              <p className="mt-1 text-2xl font-black text-emerald-100">{analysis.intentScore}%</p>
            </div>
          </div>

          <pre className="mt-6 whitespace-pre-wrap rounded-2xl border border-white/10 bg-slate-950/70 p-5 font-mono text-sm leading-7 text-cyan-50">
            {demoTranscript}
          </pre>

          <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-5">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100/75">
              <FaCheckCircle />
              Save-back result
            </div>
            <p className="mt-3 text-sm leading-6 text-emerald-50/85">{analysis.summary}</p>
            <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-emerald-100/65">
              Tags: CALL-ASSIST, {analysis.memoryPatch.objections.map((item) => item.toUpperCase().replace(/[^A-Z0-9]+/g, '-')).join(', ')}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {analysis.cards.slice(0, 4).map((card) => (
            <article key={card.id} className="rounded-2xl border border-white/10 bg-white/[0.055] p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200/60">{card.kind.replace('-', ' ')}</p>
              <h4 className="mt-2 text-lg font-black uppercase text-white">{card.title}</h4>
              <p className="mt-3 text-sm leading-6 text-slate-400">{card.body}</p>
              {card.suggestedLine && (
                <p className="mt-4 rounded-xl bg-black/30 p-3 text-sm font-bold leading-6 text-cyan-50">{card.suggestedLine}</p>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
