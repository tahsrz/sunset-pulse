'use client';

import { useState } from 'react';
import { CommandAnswer } from '@/components/command-center/results/CommandAnswer';
import { CommandDeliverables, CommandRelayPlan } from '@/components/command-center/results/CommandDeliverables';
import { CommandSources } from '@/components/command-center/results/CommandSources';
import { CommandDetails } from '@/components/command-center/results/CommandDetails';
import { CommandListingReview, type ListingReviewFacts } from '@/components/command-center/results/CommandListingReview';
import type { CommandActionItem } from '@/lib/command-center/actionTypes';
import type { AgentRun } from '@/lib/agent-workspace/types';

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

  if (!run) return <section className="rounded-lg border border-dashed border-white/15 p-5 text-sm leading-6 text-slate-400">Submit a request to see this agent’s work. Results stay attached to the agent and run that produced them.</section>;
  if (run.state === 'running' || run.state === 'queued') return <section className="rounded-lg border border-cyan-200/20 bg-cyan-200/5 p-5" aria-live="polite"><p className="text-sm font-bold text-cyan-100">Working on the submitted request…</p><ul className="mt-3 grid gap-2 text-xs text-slate-300">{run.progress.slice(-5).map((item) => <li key={item.id}>• {item.label}{item.detail ? `: ${item.detail}` : ''}</li>)}</ul></section>;
  if (run.state === 'cancelled') return <section className="rounded-lg border border-amber-200/20 p-5 text-sm text-amber-100">The client request was cancelled. A server-side command may still finish; no automatic retry was sent.</section>;
  if (run.state === 'error') return <section className="rounded-lg border border-rose-200/20 p-5 text-sm text-rose-100">{run.error || 'This run failed.'}</section>;

  const response = run.response;
  if (!response) return null;
  const listingFacts = (response.trace as (typeof response.trace & { listingFacts?: ListingReviewFacts }) | undefined)?.listingFacts;
  const copy = async () => {
    await navigator.clipboard?.writeText(response.result.deliverable.copyReadyText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };
  const handleAction = async (item: CommandActionItem) => {
    try {
      await fetch('/api/commands/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: item.kind === 'external-link',
        body: JSON.stringify({
          commandId: response.commandId,
          command: run.commandText,
          workerId: response.worker.id,
          action: item,
        }),
      });
    } catch {
      // Action memory is best-effort; the explicit UI action still proceeds.
    }
    if (onActionItem) {
      await onActionItem(run, item);
      return;
    }
    if (item.kind === 'copy' && item.copyText) {
      await navigator.clipboard?.writeText(item.copyText);
      setCopiedActionId(item.id);
      window.setTimeout(() => setCopiedActionId(null), 1500);
    }
  };

  return <div className="grid gap-4">
    <CommandAnswer commandResult={response} copiedDeliverable={copied} copiedActionId={copiedActionId} onCopyDeliverable={() => void copy()} onActionItem={handleAction} onRerunWithWorker={onRerunWithWorker ? (workerId) => onRerunWithWorker(run, workerId) : undefined} />
    <details className="rounded-lg border border-white/10 bg-slate-950/35 p-4" open>
      <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.14em] text-cyan-100">Sources and trace</summary>
      <div className="mt-4"><CommandSources commandResult={response} /></div>
    </details>
    {listingFacts ? <CommandListingReview key={run.id} listingFacts={listingFacts} sourceCommand={run.commandText} running={false} onApplyAndRerun={onRerunWithCommand ? (command) => onRerunWithCommand(run, command) : undefined} /> : null}
    <details className="rounded-lg border border-white/10 bg-slate-950/35 p-4">
      <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.14em] text-cyan-100">Deliverable frames</summary>
      <div className="mt-4"><CommandDeliverables commandResult={response} /></div>
    </details>
    <details className="rounded-lg border border-white/10 bg-slate-950/35 p-4">
      <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.14em] text-cyan-100">Relay plan</summary>
      <div className="mt-4"><CommandRelayPlan commandResult={response} /></div>
    </details>
    <CommandDetails commandResult={response as unknown as Parameters<typeof CommandDetails>[0]['commandResult']} />
  </div>;
}
