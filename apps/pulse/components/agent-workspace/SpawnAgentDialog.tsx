'use client';

import React from 'react';
import { useState } from 'react';
import type { IntelligenceWorker } from '@/lib/command-center/workerRoster';

export function SpawnAgentDialog({ open, workers, onClose, onSpawn }: { open: boolean; workers: IntelligenceWorker[]; onClose: () => void; onSpawn: (input: { workerId: string; label?: string; assignment?: string; autoListenEnabled?: boolean }) => void }) {
  const [workerId, setWorkerId] = useState('listing-summary');
  const [label, setLabel] = useState('');
  const [assignment, setAssignment] = useState('');
  const [listen, setListen] = useState(false);
  if (!open) return null;
  const worker = workers.find((item) => item.id === workerId);
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4" role="dialog" aria-modal="true" aria-labelledby="spawn-agent-title"><form onSubmit={(event) => { event.preventDefault(); onSpawn({ workerId, label, assignment, autoListenEnabled: listen }); setLabel(''); setAssignment(''); setListen(false); onClose(); }} className="w-full max-w-lg rounded-lg border border-cyan-200/30 bg-[#0c1b25] p-5 text-white shadow-2xl">
    <div className="flex items-start justify-between gap-4"><div><h2 id="spawn-agent-title" className="text-xl font-bold">Spawn an agent</h2><p className="mt-1 text-sm leading-6 text-slate-300">Microphone access is optional. Automatic listening starts only when you enable it and start the shared microphone.</p></div><button type="button" onClick={onClose} className="min-h-10 px-2 text-slate-300">Close</button></div>
    <label className="mt-5 block text-sm font-semibold">Worker role<select value={workerId} onChange={(event) => setWorkerId(event.target.value)} className="mt-1 min-h-11 w-full rounded border border-slate-600 bg-slate-950 px-3 text-white">{workers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label className="mt-3 block text-sm font-semibold">Panel label<input value={label} onChange={(event) => setLabel(event.target.value)} placeholder={worker?.name} maxLength={120} className="mt-1 min-h-11 w-full rounded border border-slate-600 bg-slate-950 px-3 text-white" /></label>
    <label className="mt-3 block text-sm font-semibold">Assignment<textarea value={assignment} onChange={(event) => setAssignment(event.target.value)} placeholder={worker?.role} maxLength={1000} rows={3} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2 text-white" /></label>
    <label className="mt-3 flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={listen} onChange={(event) => setListen(event.target.checked)} /> Enable automatic listening for this agent</label>
    <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="min-h-11 rounded border border-slate-600 px-4 text-sm">Cancel</button><button type="submit" className="min-h-11 rounded bg-cyan-200 px-4 text-sm font-black text-slate-950">Spawn agent</button></div>
  </form></div>;
}
