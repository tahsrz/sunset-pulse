'use client';

import React, { useEffect, useRef, useState } from 'react';

import Link from 'next/link';

import { ExternalLink, RefreshCw } from 'lucide-react';

import { renderGlossaryText as glossaryText } from '@/components/glossary/GlossaryText';

import type { CommandResponse } from '@/lib/command-center/commandTypes';

type CommandSupervisorReviewUiTrace = NonNullable<NonNullable<CommandResponse['trace']>['supervisorReview']>;

export type TahFactResponse = {
  date: string;
  shardIndex: number;
  source: string | null;
  slug: string | null;
  title: string;
  searchQuery: string | null;
  blurb: string;
  archive: {
    name: string;
    sourceCount: number;
    shardCount: number;
    generatedAt: string | null;
  };
};

export function CommandPostPanel({ commandResult }: { commandResult: CommandResponse | null }) {
  const commandPost = commandResult?.trace?.commandPost;
  const voltagent = commandResult?.trace?.voltagent;
  const tensorzero = commandResult?.trace?.tensorzero;
  const workflow = commandResult?.trace?.workflow;
  const postWorkflow = commandResult?.trace?.postWorkflow;
  const supervisorReview = commandResult?.trace?.supervisorReview;
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm leading-6 text-slate-300">
          Operator console status and system checks live here now, away from the answer.
        </p>
        <Link
          href="/admin/orchestrator"
          className="inline-flex min-h-9 shrink-0 items-center gap-2 border border-cyan-200/30 px-3 text-xs font-black uppercase tracking-[0.12em] text-cyan-100 transition hover:bg-cyan-200 hover:text-slate-950"
        >
          Open
          <ExternalLink size={13} />
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <DevMetric label="Status" value={commandPost?.status || 'standby'} />
        <DevMetric label="Waiting" value={String(commandPost?.pendingTerminalIntentCount ?? 0)} />
        <DevMetric label="Archive" value={commandPost?.masterArchive?.status || 'pending'} />
        <DevMetric label="Notes" value={String(commandPost?.masterArchive?.shardCount ?? commandResult?.trace?.atlasDiagnostics?.totalSegments ?? 0)} />
        <DevMetric label="Search" value={commandResult?.trace?.retrievalPolicy ? 'active' : 'standby'} />
        <DevMetric label="Saved" value={commandResult?.trace?.queryMemory?.status || 'standby'} />
        <DevMetric label="Workflow" value={workflow?.status || 'standby'} />
        <DevMetric label="Retries" value={String((workflow?.retriedOperations || 0) + (postWorkflow?.retriedOperations || 0))} />
        <DevMetric label="Supervisor" value={formatSupervisorStatus(supervisorReview)} />
        <DevMetric label="Findings" value={String(supervisorReview?.findingCount ?? 0)} />
        <DevMetric label="VoltAgent" value={voltagent?.status || 'standby'} />
        <DevMetric label="Agent" value={voltagent?.agentId ? 'advisor' : 'none'} />
        <DevMetric label="SQLSync" value={commandResult?.trace?.queryMemory?.sqlsync?.status || 'standby'} />
        <DevMetric label="Mutations" value={commandResult?.trace?.queryMemory?.sqlsync?.saved ? 'staged' : 'none'} />
        <DevMetric label="TensorZero" value={tensorzero?.status || 'standby'} />
        <DevMetric label="Eval" value={typeof tensorzero?.score === 'number' ? String(tensorzero.score) : 'none'} />
      </div>
      <p className="mt-3 break-all font-mono text-[10px] text-slate-500">
        {commandPost?.endpoint || '/api/admin/orchestrator/command'}
      </p>
      {commandPost?.statusProbe ? (
        <div className="mt-3 border border-white/10 bg-[#071016] p-2">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">
            {commandPost.statusProbe.action}
          </p>
          <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-xs leading-5 text-slate-300">
            {commandPost.statusProbe.reply}
          </p>
        </div>
      ) : null}
      {voltagent ? (
        <div className="mt-3 border border-violet-200/20 bg-violet-300/10 p-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-100">
              VoltAgent Advisor
            </p>
            <span className="font-mono text-[10px] text-slate-400">{voltagent.model || voltagent.status}</span>
          </div>
          <p className="mt-2 line-clamp-5 text-xs leading-5 text-slate-200">
            {voltagent.text || 'Advisor unavailable for this run.'}
          </p>
          {voltagent.reason ? (
            <p className="mt-2 text-[10px] leading-4 text-slate-500">
              {voltagent.reason}
            </p>
          ) : null}
        </div>
      ) : null}
      {tensorzero ? (
        <div className="mt-3 border border-amber-200/20 bg-amber-300/10 p-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-100">
              TensorZero Eval
            </p>
            <span className="font-mono text-[10px] text-slate-400">{tensorzero.variantName}</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <DevMetric label="Quality" value={String(tensorzero.metrics?.command_center_quality ?? 'n/a')} />
            <DevMetric label="Safe" value={String(tensorzero.metrics?.command_center_safety ?? 'n/a')} />
            <DevMetric label="Action" value={String(tensorzero.metrics?.command_center_actionable ?? 'n/a')} />
            <DevMetric label="Grounded" value={tensorzero.metrics?.command_center_grounded ? 'yes' : 'no'} />
          </div>
          <p className="mt-2 text-[10px] leading-4 text-slate-500">
            {tensorzero.gateway?.note || tensorzero.reason || tensorzero.path}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function TahNotePanel({
  dailyFact,
  factBusy,
  factError,
  onLoad
}: {
  dailyFact: TahFactResponse | null;
  factBusy: boolean;
  factError: string;
  onLoad: () => void;
}) {
  return (
    <div>
      {dailyFact ? (
        <>
          <p className="text-sm leading-6 text-slate-200">{glossaryText(dailyFact.blurb)}</p>
          <div className="mt-3 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">
            <span>{dailyFact.title}</span>
            {dailyFact.source && <span>{dailyFact.source}</span>}
            <span>Note {dailyFact.shardIndex}</span>
            <span>{dailyFact.archive.shardCount} notes</span>
          </div>
        </>
      ) : (
        <p className="text-sm leading-6 text-slate-300">{factError || 'Load a random TAH note when you want ambient context.'}</p>
      )}
      <button
        type="button"
        onClick={onLoad}
        disabled={factBusy}
        className="mt-3 inline-flex min-h-9 items-center justify-center gap-2 border border-cyan-200/30 px-3 text-xs font-black uppercase tracking-[0.14em] text-cyan-100 transition hover:bg-cyan-200 hover:text-slate-950 disabled:opacity-50"
      >
        <RefreshCw size={14} className={factBusy ? 'animate-spin' : ''} />
        {dailyFact ? 'Shuffle' : 'Load Note'}
      </button>
    </div>
  );
}

function DevMetric({ label, value }: { label: string; value: string }) {
  return (
    <div data-testid={`dev-metric-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="border border-white/10 bg-[#071016] px-2 py-2">
      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 truncate font-mono text-xs font-black text-white">{value}</p>
    </div>
  );
}

function formatSupervisorStatus(review?: CommandSupervisorReviewUiTrace) {
  if (review?.status === 'succeeded' && review.severity === 'error') return 'errors';
  if (!review) return 'standby';
  if (review.status === 'succeeded' && review.severity === 'warning') return 'warnings';
  if (review.status === 'succeeded') return 'passed';
  return review.status;
}

export function CommandDetails({ commandResult }: { commandResult?: CommandResponse }) {
  const [dailyFact, setDailyFact] = useState<TahFactResponse | null>(null);
  const [factBusy, setFactBusy] = useState(false);
  const [factError, setFactError] = useState('');
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const load = async () => {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setFactBusy(true);
    setFactError('');
    try {
      const response = await fetch('/api/tah/fact?refresh=' + Date.now(), { cache: 'no-store', signal: request.signal });
      const body = await response.json();
      if (!response.ok || typeof body?.blurb !== 'string' || !body?.archive) throw new Error('Unable to load a TAH note.');
      if (!request.signal.aborted) setDailyFact(body);
    } catch {
      if (!request.signal.aborted) setFactError('Unable to load a TAH note.');
    } finally { if (!request.signal.aborted) setFactBusy(false); }
  };
  return <div className="grid gap-4">
    <section className="rounded-lg border border-white/10 p-4"><h2 className="mb-3 font-bold">Command Post</h2><CommandPostPanel commandResult={commandResult || null} />{commandResult?.trace?.supervisorNotes?.map((note) => <p key={note} className="mt-2 text-xs text-amber-100">{note}</p>)}</section>
    <section className="rounded-lg border border-white/10 p-4"><h2 className="mb-3 font-bold">TAH Note</h2><TahNotePanel dailyFact={dailyFact} factBusy={factBusy} factError={factError} onLoad={() => void load()} />{dailyFact && factError ? <p role="status">{factError}</p> : null}</section>
  </div>;
}
