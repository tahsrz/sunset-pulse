'use client';

import React, { useState } from 'react';
import { CommandAnswer } from '@/components/command-center/results/CommandAnswer';
import { CommandDeliverables, CommandRelayPlan } from '@/components/command-center/results/CommandDeliverables';
import { CommandSources } from '@/components/command-center/results/CommandSources';
import { CommandDetails } from '@/components/command-center/results/CommandDetails';
import { buildApprovedListingCommand } from '@/lib/command-center/listingReviewHelpers';
import type { CommandActionItem } from '@/lib/command-center/actionTypes';
import type { AgentRun } from '@/lib/agent-workspace/types';
import { AgentEmailDraft } from './AgentEmailDraft';
import { PropertyContextCapture } from './PropertyContextCapture';

export function AgentResults({
  run,
  onActionItem,
  onRerunWithWorker,
  onRerunWithCommand,
}: {
  run?: AgentRun;
  onActionItem?: (run: AgentRun, item: CommandActionItem) => Promise<void>;
  onRerunWithWorker?: (run: AgentRun, workerId: string) => void;
  onRerunWithCommand?: (run: AgentRun, command: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [copiedActionId, setCopiedActionId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string>();

  if (!run) return <section className="rounded-lg border border-dashed border-white/15 p-5 text-sm leading-6 text-slate-400">Submit a request to see this agent’s work. Results stay attached to the agent and run that produced them.</section>;
  if (run.state === 'running' || run.state === 'queued') return <section className="rounded-lg border border-cyan-200/20 bg-cyan-200/5 p-5" aria-live="polite"><p className="text-sm font-bold text-cyan-100">Working on the submitted request…</p><ul className="mt-3 grid gap-2 text-xs text-slate-300">{run.progress.slice(-5).map((item) => <li key={item.id}>• {item.label}{item.detail ? `: ${item.detail}` : ''}</li>)}</ul></section>;
  if (run.state === 'cancelled') return <section className="rounded-lg border border-amber-200/20 p-5 text-sm text-amber-100">The client request was cancelled. A server-side command may still finish; no automatic retry was sent.</section>;
  if (run.state === 'error') return <section className="rounded-lg border border-rose-200/20 p-5 text-sm text-rose-100">{run.error || 'This run failed.'}</section>;

  const response = run.response;
  if (!response) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(response.result.deliverable.copyReadyText);
      setCopied(true);
      setCopyError(undefined);
    } catch { setCopyError('Clipboard unavailable. Select and copy the visible output.'); }
  };
  const handleAction = async (item: CommandActionItem) => {
    // Start clipboard work within the user gesture, before any network await.
    const copying = item.kind === 'copy' && item.copyText ? navigator.clipboard?.writeText(item.copyText) : undefined;
    void fetch('/api/commands/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: item.kind === 'external-link',
        body: JSON.stringify({
          commandId: response.commandId,
          command: run.commandText,
          workerId: response.worker.id,
          action: item,
          tensorzero: { evaluationId: response.trace?.tensorzero?.evaluationId, variantName: response.trace?.tensorzero?.variantName },
        }),
      }).catch(() => undefined);
    if (item.kind === 'copy' && item.copyText) {
      try {
        if (!copying) throw new Error('Clipboard unavailable');
        await copying;
        setCopiedActionId(item.id);
        setCopyError(undefined);
      } catch { setCopyError('Clipboard unavailable. Select and copy the visible output.'); }
    } else if (onActionItem) await onActionItem(run, item);
  };

  return <div className="grid gap-4">
    {copyError ? <p role="status" className="text-sm text-amber-100">{copyError}</p> : null}
    <CommandAnswer commandResult={response} copiedDeliverable={copied} copiedActionId={copiedActionId} onCopyDeliverable={() => void copy()} onActionItem={handleAction} onRerunWithWorker={onRerunWithWorker ? (workerId) => onRerunWithWorker(run, workerId) : undefined} />
    <PropertyContextCapture commandId={response.commandId} command={run.commandText} title={response.result.title} body={response.result.deliverable.copyReadyText} />
    <AgentEmailDraft run={run} />
    <section aria-label="Copy-ready deliverable" className="rounded-lg border border-white/10 p-4"><h3 className="font-bold">{response.result.deliverable.title}</h3><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">{response.result.deliverable.copyReadyText}</p></section>
    <details className="rounded-lg border border-white/10 bg-slate-950/35 p-4" open>
      <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.14em] text-cyan-100">Sources and trace</summary>
      <div className="mt-4"><CommandSources commandResult={response} sourceCommand={run.commandText} onRerunWithApprovedListing={onRerunWithCommand ? (draft) => onRerunWithCommand(run, buildApprovedListingCommand(draft)) : undefined} /></div>
    </details>
    <details className="rounded-lg border border-white/10 bg-slate-950/35 p-4">
      <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.14em] text-cyan-100">Deliverable frames</summary>
      <div className="mt-4"><CommandDeliverables commandResult={response} /></div>
    </details>
    <details className="rounded-lg border border-white/10 bg-slate-950/35 p-4">
      <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.14em] text-cyan-100">Relay plan</summary>
      <div className="mt-4"><CommandRelayPlan commandResult={response} /></div>
    </details>
    <CommandDetails commandResult={response} />
  </div>;
}
