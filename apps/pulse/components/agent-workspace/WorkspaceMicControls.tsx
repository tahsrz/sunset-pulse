'use client';

import React from 'react';
import { Mic, MicOff, Pause, Play } from 'lucide-react';
import type { JamieAudioStatus } from '@/context/JamieAudioContext';

export function WorkspaceMicControls({ status, paused, onStart, onStop, onPause }: { status: JamieAudioStatus; paused: boolean; onStart: () => void; onStop: () => void; onPause: () => void }) {
  const active = ['listening', 'speech-detected', 'starting', 'permission-required', 'jamie-speaking'].includes(status);
  const label = status === 'denied' ? 'Microphone denied' : status === 'unavailable' ? 'Speech recognition unavailable' : status === 'jamie-speaking' ? 'Paused while audio plays' : active ? 'Shared microphone on' : 'Microphone off';
  return <div className="flex flex-wrap items-center gap-2" aria-label="Workspace microphone controls"><span className="inline-flex min-h-10 items-center gap-2 rounded border border-white/10 px-3 text-xs font-bold text-slate-200"><span className={`h-2 w-2 rounded-full ${active ? 'bg-emerald-300' : status === 'denied' || status === 'unavailable' ? 'bg-rose-300' : 'bg-slate-500'}`} />{label}</span>{active ? <button type="button" onClick={onStop} className="inline-flex min-h-10 items-center gap-2 rounded border border-white/15 px-3 text-xs font-bold text-white"><MicOff size={15} /> Stop</button> : <button type="button" onClick={onStart} className="inline-flex min-h-10 items-center gap-2 rounded bg-cyan-200 px-3 text-xs font-black text-slate-950"><Mic size={15} /> Start microphone</button>}<button type="button" onClick={onPause} className="inline-flex min-h-10 items-center gap-2 rounded border border-amber-200/30 px-3 text-xs font-bold text-amber-100">{paused ? <Play size={15} /> : <Pause size={15} />}{paused ? 'Resume automation' : 'Pause automation'}</button>{status === 'denied' || status === 'unavailable' ? <span className="basis-full text-xs text-amber-100">You can still type into an agent’s submission field without microphone support.</span> : null}</div>;
}
