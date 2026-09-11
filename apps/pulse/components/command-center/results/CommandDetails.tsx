'use client';

import { ExternalLink, RefreshCw } from 'lucide-react';
import React from 'react';
import Link from 'next/link';
import { useState } from 'react';

type DetailsResponse = {
  trace?: {
    atlasDiagnostics?: { totalSegments: number };
    retrievalPolicy?: unknown;
    queryMemory?: { status?: string; sqlsync?: { status?: string; saved?: boolean } };
    workflow?: { status?: string; retriedOperations?: number };
    postWorkflow?: { retriedOperations?: number };
    commandPost?: {
      status?: string;
      endpoint?: string;
      pendingTerminalIntentCount?: number;
      masterArchive?: { status?: string; shardCount?: number };
      statusProbe?: { action: string; reply: string };
    };
    supervisorReview?: { status?: string; findingCount?: number };
    supervisorNotes?: string[];
    voltagent?: { status?: string; agentId?: string; model?: string; text?: string; reason?: string };
    tensorzero?: {
      status?: string;
      variantName?: string;
      score?: number;
      metrics?: { command_center_quality?: number; command_center_safety?: number; command_center_actionable?: number; command_center_grounded?: boolean };
      gateway?: { note?: string };
      reason?: string;
      path?: string;
    };
  };
};

type DailyFact = {
  title: string;
  source: string | null;
  shardIndex: number;
  blurb: string;
  archive: { shardCount: number };
};

export function CommandDetails({ commandResult }: { commandResult?: DetailsResponse }) {
  const trace = commandResult?.trace;
  return <div className="grid gap-4 lg:grid-cols-2"><CommandPostDetails trace={trace} /><TahNoteDetails /></div>;
}

function CommandPostDetails({ trace }: { trace: DetailsResponse['trace'] }) {
  const commandPost = trace?.commandPost;
  const supervisorReview = trace?.supervisorReview;
  const workflow = trace?.workflow;
  const postWorkflow = trace?.postWorkflow;
  const voltagent = trace?.voltagent;
  const tensorzero = trace?.tensorzero;
  return <section className="rounded-lg border border-white/10 bg-[#0d1c27] p-4"><div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-black uppercase tracking-[0.16em] text-cyan-100">Command Post</h2><p className="mt-2 text-sm leading-6 text-slate-300">Operator status and system checks stay attached to this run.</p></div><Link href="/admin/orchestrator" className="inline-flex min-h-9 shrink-0 items-center gap-2 border border-cyan-200/30 px-3 text-xs font-black uppercase tracking-[0.12em] text-cyan-100 transition hover:bg-cyan-200 hover:text-slate-950">Open <ExternalLink size={13} /></Link></div><div className="mt-3 grid grid-cols-2 gap-2"><DevMetric label="Status" value={commandPost?.status || 'standby'} /><DevMetric label="Waiting" value={String(commandPost?.pendingTerminalIntentCount ?? 0)} /><DevMetric label="Archive" value={commandPost?.masterArchive?.status || 'pending'} /><DevMetric label="Notes" value={String(commandPost?.masterArchive?.shardCount ?? trace?.atlasDiagnostics?.totalSegments ?? 0)} /><DevMetric label="Search" value={trace?.retrievalPolicy ? 'active' : 'standby'} /><DevMetric label="Saved" value={trace?.queryMemory?.status || 'standby'} /><DevMetric label="Workflow" value={workflow?.status || 'standby'} /><DevMetric label="Retries" value={String((workflow?.retriedOperations || 0) + (postWorkflow?.retriedOperations || 0))} /><DevMetric label="Supervisor" value={formatSupervisorStatus(supervisorReview)} /><DevMetric label="Findings" value={String(supervisorReview?.findingCount ?? 0)} /><DevMetric label="VoltAgent" value={voltagent?.status || 'standby'} /><DevMetric label="TensorZero" value={tensorzero?.status || 'standby'} /></div><p className="mt-3 break-all font-mono text-[10px] text-slate-500">{commandPost?.endpoint || '/api/admin/orchestrator/command'}</p>{trace?.supervisorNotes?.length ? <div className="mt-3 border border-amber-200/20 bg-amber-300/10 p-3"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-100">Supervisor notes</p><ul className="mt-2 grid gap-1 text-xs leading-5 text-amber-50">{trace.supervisorNotes.map((note) => <li key={note}>• {note}</li>)}</ul></div> : null}{commandPost?.statusProbe ? <div className="mt-3 border border-white/10 bg-[#071016] p-2"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">{commandPost.statusProbe.action}</p><p className="mt-2 line-clamp-4 whitespace-pre-wrap text-xs leading-5 text-slate-300">{commandPost.statusProbe.reply}</p></div> : null}{voltagent ? <div className="mt-3 border border-violet-200/20 bg-violet-300/10 p-2"><div className="flex items-center justify-between gap-2"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-100">VoltAgent Advisor</p><span className="font-mono text-[10px] text-slate-400">{voltagent.model || voltagent.status}</span></div><p className="mt-2 line-clamp-5 text-xs leading-5 text-slate-200">{voltagent.text || 'Advisor unavailable for this run.'}</p>{voltagent.reason ? <p className="mt-2 text-[10px] leading-4 text-slate-500">{voltagent.reason}</p> : null}</div> : null}{tensorzero ? <div className="mt-3 border border-amber-200/20 bg-amber-300/10 p-2"><div className="flex items-center justify-between gap-2"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-100">TensorZero Eval</p><span className="font-mono text-[10px] text-slate-400">{tensorzero.variantName || tensorzero.status}</span></div><div className="mt-2 grid grid-cols-2 gap-2"><DevMetric label="Quality" value={String(tensorzero.metrics?.command_center_quality ?? 'n/a')} /><DevMetric label="Safe" value={String(tensorzero.metrics?.command_center_safety ?? 'n/a')} /><DevMetric label="Action" value={String(tensorzero.metrics?.command_center_actionable ?? 'n/a')} /><DevMetric label="Grounded" value={tensorzero.metrics?.command_center_grounded ? 'yes' : 'no'} /></div><p className="mt-2 text-[10px] leading-4 text-slate-500">{tensorzero.gateway?.note || tensorzero.reason || tensorzero.path}</p></div> : null}</section>;
}

function TahNoteDetails() {
  const [fact, setFact] = useState<DailyFact | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/tah/fact?refresh=${Date.now()}`, { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || 'Unable to load a TAH note.');
      setFact(body as DailyFact);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load a TAH note.');
    } finally {
      setBusy(false);
    }
  };
  return <section className="rounded-lg border border-white/10 bg-[#0d1c27] p-4"><h2 className="text-sm font-black uppercase tracking-[0.16em] text-cyan-100">TAH Note</h2>{fact ? <><p className="mt-3 text-sm leading-6 text-slate-200">{fact.blurb}</p><div className="mt-3 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500"><span>{fact.title}</span>{fact.source ? <span>{fact.source}</span> : null}<span>Note {fact.shardIndex}</span><span>{fact.archive.shardCount} notes</span></div></> : <p className="mt-3 text-sm leading-6 text-slate-300">{error || 'Load a random TAH note when you want ambient context.'}</p>}<button type="button" onClick={() => void load()} disabled={busy} className="mt-3 inline-flex min-h-9 items-center justify-center gap-2 border border-cyan-200/30 px-3 text-xs font-black uppercase tracking-[0.14em] text-cyan-100 transition hover:bg-cyan-200 hover:text-slate-950 disabled:opacity-50"><RefreshCw size={14} className={busy ? 'animate-spin' : ''} />{fact ? 'Shuffle' : 'Load Note'}</button></section>;
}

function DevMetric({ label, value }: { label: string; value: string }) { return <div data-testid={`dev-metric-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="border border-white/10 bg-[#071016] px-2 py-2"><p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p><p className="mt-1 truncate font-mono text-xs font-black text-white">{value}</p></div>; }
function formatSupervisorStatus(review?: { status?: string; findingCount?: number }) { if (!review) return 'standby'; if (review.status === 'succeeded' && (review.findingCount || 0) > 0) return 'warnings'; if (review.status === 'succeeded') return 'passed'; return review.status || 'standby'; }
