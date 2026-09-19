'use client';

import React from 'react';
import { Pause, Play, Trash2 } from 'lucide-react';
import type { AgentSession, AgentRun } from '@/lib/agent-workspace/types';

export function AgentRail({ agents, selectedAgentId, runs, onSelect, onListenChange, onRemove, onSpawn }: {
  agents: AgentSession[];
  selectedAgentId: string | null;
  runs: Record<string, AgentRun>;
  onSelect: (id: string) => void;
  onListenChange: (id: string, enabled: boolean) => void;
  onRemove: (id: string) => void;
  onSpawn: () => void;
}) {
  return <aside className="min-w-0 border-b border-slate-700/70 bg-slate-950/50 p-3 lg:border-b-0 lg:border-r" aria-label="Spawned agents">
    <div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200">Agents</h2><button type="button" onClick={onSpawn} className="min-h-10 rounded border border-cyan-200/30 px-3 text-xs font-bold text-cyan-100 hover:bg-cyan-200/10">Spawn</button></div>
    {!agents.length ? <p className="text-sm leading-6 text-slate-400">No agents yet. Spawn a role to begin a focused workspace.</p> : <div className="grid gap-2 lg:grid-cols-1 sm:grid-cols-3">
      {agents.map((agent) => {
        const currentRun = Object.values(runs).find((run) => run.agentId === agent.id && ['queued', 'running'].includes(run.state));
        return <div key={agent.id} className={`min-w-0 rounded border p-2 ${selectedAgentId === agent.id ? 'border-cyan-200/60 bg-cyan-200/10' : 'border-white/10 bg-white/[0.03]'}`}>
          <button type="button" aria-label={`Select ${agent.label}`} onClick={() => onSelect(agent.id)} className="block min-h-11 w-full min-w-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200"><span className="block truncate font-bold text-white">{agent.label}</span><span className="mt-1 block truncate text-xs text-slate-400">{currentRun ? 'Working' : agent.autoListenEnabled ? 'Listening' : 'Manual only'}</span></button>
          <div className="mt-2 flex items-center justify-between gap-1 border-t border-white/10 pt-2"><button type="button" aria-label={`${agent.autoListenEnabled ? 'Pause' : 'Enable'} automatic listening for ${agent.label}`} onClick={() => onListenChange(agent.id, !agent.autoListenEnabled)} className="inline-flex min-h-10 items-center gap-1 rounded px-2 text-xs text-cyan-100 hover:bg-white/10">{agent.autoListenEnabled ? <Pause size={14} /> : <Play size={14} />}{agent.autoListenEnabled ? 'Pause' : 'Listen'}</button><button type="button" aria-label={`Remove ${agent.label}`} onClick={() => onRemove(agent.id)} className="min-h-10 rounded px-2 text-xs text-rose-200 hover:bg-rose-300/10"><Trash2 size={14} /></button></div>
        </div>;
      })}
    </div>}
  </aside>;
}
