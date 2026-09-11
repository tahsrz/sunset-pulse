'use client';

import { Check, ChevronRight, Copy, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { renderGlossaryText as glossaryText } from '@/components/glossary/GlossaryText';
import { CommandActionPanel } from '@/components/command-center/CommandActionPanel';
import { ParsedRecordCard } from '@/components/command-center/ParsedRecordCard';
import { intelligenceWorkers } from '@/lib/command-center/workerRoster';
import type { CommandProgressEvent } from '@/components/agent-console/agentConsoleConfig';
import type { CivicServiceRecord, CommandActionItem } from '@/lib/command-center/actionTypes';

export type CommandAnswerResponse = {
  commandId: string;
  worker: { id: string; name: string };
  result: {
    title: string;
    summary: string;
    actions: string[];
    confidence: number;
    civicRecord?: CivicServiceRecord;
    actionItems?: CommandActionItem[];
    deliverable: {
      title: string;
      copyReadyText: string;
    };
  };
  trace?: {
    progress?: CommandProgressEvent[];
    queryMemory?: { saved?: boolean };
  };
};

export function CommandAnswer({
  commandResult,
  copiedDeliverable,
  copiedActionId,
  onCopyDeliverable,
  onActionItem,
  onRerunWithWorker,
}: {
  commandResult: CommandAnswerResponse;
  copiedDeliverable: boolean;
  copiedActionId: string | null;
  onCopyDeliverable: () => void;
  onActionItem: (item: CommandActionItem) => Promise<void>;
  onRerunWithWorker?: (workerId: string) => void;
}) {
  return (
    <div data-testid="command-answer" className="border border-emerald-200/25 bg-[#0d1c27] p-4 shadow-2xl shadow-black/20">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="border border-emerald-200/30 bg-emerald-300/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100">Answer</span>
            <span data-testid="command-answer-worker" className="border border-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{commandResult.worker.name}</span>
            <span className="border border-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{commandResult.result.confidence}% confidence</span>
          </div>
          <h2 className="mt-3 text-2xl font-black leading-tight text-white md:text-3xl">{glossaryText(commandResult.result.title)}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">{glossaryText(commandResult.result.summary)}</p>
        </div>
        <button type="button" onClick={onCopyDeliverable} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 border border-emerald-200/40 px-3 text-xs font-black uppercase tracking-[0.14em] text-emerald-100 transition hover:bg-emerald-200 hover:text-slate-950">
          {copiedDeliverable ? <Check size={14} /> : <Copy size={14} />}
          {copiedDeliverable ? 'Copied' : 'Copy'}
        </button>
      </div>

      <CommandProgressRail progress={commandResult.trace?.progress || []} />
      {onRerunWithWorker ? <RoutingCorrectionPanel commandResult={commandResult} onRerunWithWorker={onRerunWithWorker} /> : null}

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {commandResult.result.actions.map((action) => (
          <div key={action} className="border border-white/10 bg-black/20 p-3">
            <div className="flex gap-2 text-sm leading-6 text-slate-200"><ChevronRight size={16} className="mt-1 shrink-0 text-emerald-100" /><span>{glossaryText(action)}</span></div>
          </div>
        ))}
      </div>

      {commandResult.result.civicRecord ? <div className="mt-4"><ParsedRecordCard record={commandResult.result.civicRecord} /></div> : null}
      {commandResult.result.actionItems?.length ? <div className="mt-4"><CommandActionPanel actions={commandResult.result.actionItems} copiedActionId={copiedActionId} saved={Boolean(commandResult.trace?.queryMemory?.saved)} onAction={onActionItem} /></div> : null}
    </div>
  );
}

export function CommandProgressRail({ progress }: { progress: CommandProgressEvent[] }) {
  if (!progress.length) return null;
  return (
    <div data-testid="command-progress-rail" className="mt-4 grid gap-2 border border-white/10 bg-black/20 p-3 md:grid-cols-6">
      {progress.map((item) => (
        <div key={item.id} className="min-w-0">
          <div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.status === 'complete' ? 'bg-emerald-300' : item.status === 'queued' ? 'bg-amber-300' : 'bg-slate-600'}`} /><p className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-slate-300">{item.label}</p></div>
          {item.detail ? <p className="mt-1 truncate text-[10px] text-slate-500">{item.detail}</p> : null}
        </div>
      ))}
    </div>
  );
}

function RoutingCorrectionPanel({ commandResult, onRerunWithWorker }: { commandResult: CommandAnswerResponse; onRerunWithWorker: (workerId: string) => void }) {
  const [nextWorkerId, setNextWorkerId] = useState(commandResult.worker.id);
  useEffect(() => setNextWorkerId(commandResult.worker.id), [commandResult.commandId, commandResult.worker.id]);
  return (
    <div data-testid="routing-correction" className="mt-3 flex flex-col gap-2 border border-white/10 bg-black/20 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Wrong Helper?</p><p className="mt-1 text-xs leading-5 text-slate-300">Switch the route and rerun the same command.</p></div>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
        <select aria-label="Rerun with helper" value={nextWorkerId} onChange={(event) => setNextWorkerId(event.target.value)} className="min-h-9 min-w-0 border border-white/10 bg-[#071016] px-2 text-xs font-bold text-white outline-none transition focus:border-cyan-200/50">
          {intelligenceWorkers.map((worker) => <option key={worker.id} value={worker.id}>{worker.name}</option>)}
        </select>
        <button type="button" aria-label="Rerun command with selected helper" disabled={nextWorkerId === commandResult.worker.id} onClick={() => onRerunWithWorker(nextWorkerId)} className="inline-flex min-h-9 items-center justify-center gap-2 border border-cyan-200/30 px-3 text-xs font-black uppercase tracking-[0.12em] text-cyan-100 transition hover:bg-cyan-200 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"><RefreshCw size={13} />Rerun</button>
      </div>
    </div>
  );
}
