'use client';

import React from 'react';
import { useRef } from 'react';
import type { TranscriptSegment } from '@/lib/agent-workspace/types';

export function SharedTranscript({ segments, interimCaption, onUseRecentSpeech }: { segments: TranscriptSegment[]; interimCaption: string; onUseRecentSpeech: () => void }) {
  const listRef = useRef<HTMLDivElement>(null);
  return <section className="min-w-0 rounded-lg border border-white/10 bg-slate-950/35 p-4" aria-labelledby="shared-transcript-title"><div className="flex items-center justify-between gap-3"><h2 id="shared-transcript-title" className="text-sm font-black uppercase tracking-[0.14em] text-cyan-100">Shared conversation</h2><button type="button" onClick={() => listRef.current?.lastElementChild?.scrollIntoView({ behavior: 'smooth' })} className="min-h-10 rounded border border-white/15 px-3 text-xs font-bold text-slate-200">Jump to latest</button></div><div ref={listRef} className="mt-3 max-h-72 min-h-24 overflow-y-auto rounded border border-white/10 bg-black/10 p-3"><div className="grid gap-2">{segments.length ? segments.map((segment) => <p key={segment.id} className="text-sm leading-6 text-slate-100"><span className="mr-2 text-[10px] text-slate-500">{new Date(segment.capturedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>{segment.text}</p>) : <p className="text-sm leading-6 text-slate-400">Finalized speech will appear here. Interim words stay separate until recognition confirms them.</p>}{interimCaption ? <p className="border-t border-dashed border-cyan-200/20 pt-2 text-sm italic leading-6 text-cyan-100/70" aria-label="Interim microphone caption">{interimCaption}</p> : null}</div></div><button type="button" disabled={!segments.length} onClick={onUseRecentSpeech} className="mt-3 min-h-10 rounded border border-cyan-200/30 px-3 text-xs font-bold text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40">Use recent speech in this agent’s draft</button></section>;
}
