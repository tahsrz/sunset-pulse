'use client';

import React from 'react';
import Link from 'next/link';
import type { SellerSetupHealth } from '@/lib/realtor-workspace/sellerSetupGuide';
import { deriveSellerSetupSteps } from '@/lib/realtor-workspace/sellerSetupGuide';

const statusLabel = { ready: 'Ready', needs_action: 'Needs action', unavailable: 'Unavailable' } as const;
const statusClass = {
  ready: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100',
  needs_action: 'border-amber-200/30 bg-amber-200/10 text-amber-100',
  unavailable: 'border-white/15 bg-white/5 text-slate-300',
} as const;

export function SellerSetupGuide({ health, onRefresh }: { health: SellerSetupHealth; onRefresh: () => void }) {
  const steps = deriveSellerSetupSteps(health);
  return <div className="space-y-6">
    <section className="fieldbook-record rounded-2xl border border-white/15 p-5">
      <h2 className="text-xl font-semibold">Set up your seller workflow</h2>
      <p className="mt-2 text-sm text-slate-300">These steps reflect the settings and records currently saved to your account.</p>
      <ol className="mt-5 space-y-3">{steps.map((step, index) => <li key={step.key} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{index + 1}. {step.title}</h3><span className={`rounded-full border px-2.5 py-1 text-xs ${statusClass[step.status]}`}>{statusLabel[step.status]}</span></div>
        <p className="mt-2 text-sm text-slate-300">{step.detail}</p>
        <Link className="mt-3 inline-block min-h-11 content-center text-sm text-cyan-200 underline" href={step.href}>{step.action}</Link>
      </li>)}</ol>
      {!health.emailConfigured ? <p className="mt-4 rounded-lg border border-white/10 p-3 text-sm text-slate-300">Email sending is not set up. You can still contact sellers from your verified mailbox and record those conversations here.</p> : null}
    </section>
    <details className="fieldbook-record rounded-2xl border border-white/15 p-5">
      <summary className="cursor-pointer font-semibold">Operator details</summary>
      <p className="mt-3 text-sm text-slate-300">Stored worker records and app configuration. A configured sender or a prior completion does not prove a deployed schedule is currently running.</p>
      <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Stat label="Pending jobs" value={health.pendingJobs}/><Stat label="Failed jobs" value={health.failedJobs}/><Stat label="Emails needing review" value={health.unresolvedEmails}/>
        <Stat label="Sender configuration" value={health.emailConfigured ? 'Configured' : 'Not configured'}/><Stat label="Email workflow" value={health.emailContractEnabled ? 'Enabled' : 'Unavailable'}/><Stat label="Delivery receipt hook" value={health.webhookConfigured ? 'Configured' : 'Not configured'}/>
        <div><dt className="text-xs text-slate-400">Latest completed job</dt><dd className="mt-1 text-sm">{health.lastCompletedJob ? new Date(health.lastCompletedJob).toLocaleString(undefined, { timeZone: health.timeZone || 'America/Chicago' }) : 'No completion recorded'}</dd></div>
      </dl>
      {health.failedJobs || health.unresolvedEmails ? <p className="mt-4 text-sm text-amber-100">Some work needs an operator review. Check provider receipts before retrying an email with an unknown result.</p> : null}
      <button type="button" className="mt-4 text-sm text-cyan-200 underline" onClick={onRefresh}>Refresh saved status</button>
    </details>
  </div>;
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return <div className="fieldbook-record rounded-xl bg-white/5 p-3"><dt className="text-xs text-slate-400">{label}</dt><dd className="mt-1 text-lg font-semibold">{value}</dd></div>;
}
