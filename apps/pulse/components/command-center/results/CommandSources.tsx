'use client';

import { Copy, Check } from 'lucide-react';
import React from 'react';
import { useState } from 'react';
import { renderGlossaryText as glossaryText } from '@/components/glossary/GlossaryText';

type SourcesResponse = {
  trace?: {
    selectedShards?: Array<{ expertId?: number; title: string; source: string; score?: number; excerpt: string }>;
    classification?: { intent: string; confidence: number };
    contextBudget?: { totalKept: number; estimatedTokens?: number };
    retrievalPolicy?: { stages: Array<{ name: string; input: number; kept: number }> };
  };
  intent?: string;
};

export function CommandSources({ commandResult, children }: { commandResult: SourcesResponse; children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const trace = commandResult.trace || {};
  const shards = trace.selectedShards || [];
  const copyTrace = async () => {
    await navigator.clipboard?.writeText(JSON.stringify({ intent: commandResult.intent, classification: trace.classification, contextBudget: trace.contextBudget, selectedShards: shards }, null, 2));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };
  return <div className="space-y-3">{trace.classification || trace.contextBudget ? <div className="grid gap-2 md:grid-cols-4"><TraceChip label="Intent" value={trace.classification?.intent || commandResult.intent || 'unknown'} /><TraceChip label="Confidence" value={`${trace.classification?.confidence ?? 'n/a'}%`} /><TraceChip label="Context" value={`${trace.contextBudget?.totalKept ?? shards.length} kept`} /><TraceChip label="Budget" value={`${trace.contextBudget?.estimatedTokens ?? 0} tokens`} /></div> : null}<div className="flex flex-col gap-2 border border-white/10 bg-black/20 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Trace Export</p><p className="mt-1 text-xs leading-5 text-slate-300">Copy the bounded classification, context, and selected sources.</p></div><button type="button" onClick={() => void copyTrace()} className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 border border-cyan-200/30 px-3 text-xs font-black uppercase tracking-[0.12em] text-cyan-100 transition hover:bg-cyan-200 hover:text-slate-950">{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copied' : 'Copy JSON'}</button></div>{children}{shards.length ? <div className="grid gap-2 md:grid-cols-3">{shards.slice(0, 6).map((shard) => <div key={`${shard.expertId || shard.source}-${shard.title}`} className="border border-white/10 bg-black/20 p-3"><div className="flex items-center justify-between gap-3"><p className="truncate text-xs font-black text-cyan-100">{shard.title}</p>{typeof shard.score === 'number' ? <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">{formatMatchScore(shard.score)}</span> : null}</div><p className="mt-1 truncate font-mono text-[10px] text-slate-500">{shard.source}</p><p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-300">{glossaryText(shard.excerpt)}</p></div>)}</div> : <p className="text-sm text-slate-300">No source shards were returned.</p>}{trace.retrievalPolicy ? <div className="border border-cyan-200/20 bg-cyan-300/10 p-3"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">Search Path</p><div className="mt-3 grid gap-2 md:grid-cols-2">{trace.retrievalPolicy.stages.map((stage) => <div key={stage.name} className="border border-white/10 bg-[#071016] px-2 py-2"><div className="flex items-center justify-between gap-2"><p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100">{formatSearchStage(stage.name)}</p><span className="font-mono text-[10px] text-slate-500">{stage.kept}/{stage.input}</span></div><div className="mt-2 h-1.5 bg-black/40"><div className="h-full bg-cyan-300" style={{ width: `${stage.input ? Math.max(6, Math.round((stage.kept / stage.input) * 100)) : 0}%` }} /></div></div>)}</div></div> : null}</div>;
}

function TraceChip({ label, value }: { label: string; value: string }) { return <div className="border border-white/10 bg-black/20 px-3 py-2"><p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p><p className="mt-1 truncate text-xs font-black text-cyan-100">{value}</p></div>; }
function formatMatchScore(score: number) { return score >= 100 ? 'high' : score >= 60 ? 'good' : 'light'; }
function formatSearchStage(name: string) { return ({ 'metadata filter': 'Checked file info', 'concept match': 'Matched words', 'density vitality rank': 'Ranked useful notes', 'compact context output': 'Kept best notes', 'virtual loadout fallback': 'Used helper files' } as Record<string, string>)[name] || name.replace(/[_-]+/g, ' '); }
