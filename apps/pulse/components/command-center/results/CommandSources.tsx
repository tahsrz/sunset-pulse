'use client';

import React, { useState } from 'react';

import { Check, Copy } from 'lucide-react';

import { renderGlossaryText as glossaryText } from '@/components/glossary/GlossaryText';

import type { CommandResponse } from '@/lib/command-center/commandTypes';

import type { ListingReviewDraft } from '@/lib/command-center/listingReviewHelpers';

import { ListingReviewPanel } from './CommandListingReview';

import { buildCommandTraceExport, collectWorkflowTimings, formatTimingName, formatMatchScore, formatSearchStage } from '@/lib/command-center/commandTracePresentation';

export function CommandSources({
  commandResult,
  onRerunWithApprovedListing,
  running = false,
  sourceCommand,
}: {
  commandResult: CommandResponse;
  onRerunWithApprovedListing?: (draft: ListingReviewDraft) => void;
  running?: boolean;
  sourceCommand?: string;
}) {
  const [copiedTrace, setCopiedTrace] = useState(false);
  const trace = commandResult.trace || {};
  const shards = trace.selectedShards || [];
  const timingRows = collectWorkflowTimings(commandResult);
  const listingFacts = trace.listingFacts;

  const copyTrace = async () => {
    await navigator.clipboard.writeText(JSON.stringify(buildCommandTraceExport(commandResult), null, 2));
    setCopiedTrace(true);
    window.setTimeout(() => setCopiedTrace(false), 1600);
  };

  return (
    <div className="space-y-3">
      {trace.classification || trace.contextBudget ? (
        <div className="grid gap-2 md:grid-cols-4">
          <TraceChip label="Intent" value={trace.classification?.intent || commandResult.intent || 'unknown'} />
          <TraceChip label="Confidence" value={`${trace.classification?.confidence ?? commandResult.result.confidence}%`} />
          <TraceChip label="Context" value={`${trace.contextBudget?.totalKept ?? shards.length} kept`} />
          <TraceChip
            label="Budget"
            value={`${trace.contextBudget?.estimatedTokens ?? 'unknown'} tokens`}
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-2 border border-white/10 bg-black/20 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Trace Export</p>
          <p className="mt-1 text-xs leading-5 text-slate-300">
            Copy classification, context budget, selected sources, retries, and timing.
          </p>
        </div>
        <button
          type="button"
          onClick={copyTrace}
          className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 border border-cyan-200/30 px-3 text-xs font-black uppercase tracking-[0.12em] text-cyan-100 transition hover:bg-cyan-200 hover:text-slate-950"
        >
          {copiedTrace ? <Check size={13} /> : <Copy size={13} />}
          {copiedTrace ? 'Copied' : 'Copy JSON'}
        </button>
      </div>

      {timingRows.length ? (
        <div className="border border-white/10 bg-black/20 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Node Timing</p>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            {timingRows.map((row) => (
              <div key={`${row.phase}-${row.node}-${row.operation}`} className="border border-white/10 bg-[#071016] px-2 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">
                    {formatTimingName(row.operation)}
                  </p>
                  <span className="font-mono text-[10px] text-slate-400">{row.durationMs}ms</span>
                </div>
                <p className="mt-1 truncate text-[10px] text-slate-500">
                  {row.phase} / {row.status}{row.retried ? ' / retried' : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {listingFacts?.isListingLike && onRerunWithApprovedListing ? (
        <ListingReviewPanel
          key={commandResult.commandId}
          listingFacts={listingFacts}
          sourceCommand={sourceCommand || commandResult.commandText || ''}
          onApplyAndRerun={onRerunWithApprovedListing}
          running={running}
        />
      ) : null}

      {shards.length ? (
        <div className="grid gap-2 md:grid-cols-3">
          {shards.slice(0, 6).map((shard) => (
            <div key={`${shard.expertId}-${shard.source}`} className="border border-white/10 bg-black/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-xs font-black text-cyan-100">{shard.title}</p>
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                  {typeof shard.score === 'number' ? formatMatchScore(shard.score) : 'unknown'}
                </span>
              </div>
              <p className="mt-1 truncate font-mono text-[10px] text-slate-500">{shard.source}</p>
              <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-300">{glossaryText(shard.excerpt)}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-300">No source shards were returned.</p>
      )}

      {trace.retrievalPolicy ? (
        <div className="border border-cyan-200/20 bg-cyan-300/10 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">
            Search Path
          </p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {trace.retrievalPolicy.stages.map((stage) => (
              <div key={stage.name} className="border border-white/10 bg-[#071016] px-2 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100">
                    {formatSearchStage(stage.name)}
                  </p>
                  <span className="font-mono text-[10px] text-slate-500">{stage.kept}/{stage.input}</span>
                </div>
                <div className="mt-2 h-1.5 bg-black/40">
                  <div
                    className="h-full bg-cyan-300"
                    style={{ width: `${stage.input ? Math.max(6, Math.round((stage.kept / stage.input) * 100)) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TraceChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 bg-black/20 px-3 py-2">
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 truncate text-xs font-black text-cyan-100">{value}</p>
    </div>
  );
}
