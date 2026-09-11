'use client';

import React from 'react';
import { useState } from 'react';
import { CommandRouteDirectory } from '@/components/command-center/CommandRouteDirectory';
import { AgentActivity } from './AgentActivity';
import { AgentComposer } from './AgentComposer';
import { AgentRail } from './AgentRail';
import { AgentResults } from './AgentResults';
import { SharedTranscript } from './SharedTranscript';
import { SpawnAgentDialog } from './SpawnAgentDialog';
import { useAgentWorkspace } from './useAgentWorkspace';
import { WorkspaceMicControls } from './WorkspaceMicControls';

export default function AgentWorkspace() {
  const workspace = useAgentWorkspace();
  const [showSpawn, setShowSpawn] = useState(false);
  const [mobileTab, setMobileTab] = useState<'conversation' | 'work'>('conversation');
  const selected = workspace.state.selectedAgentId ? workspace.state.agentsById[workspace.state.selectedAgentId] : undefined;
  const selectedRuns = selected ? workspace.state.runOrder.map((id) => workspace.state.runsById[id]).filter((run) => run?.agentId === selected.id) : [];
  const selectedRun = selectedRuns[selectedRuns.length - 1];
  const busy = Boolean(selectedRuns.some((run) => ['queued', 'running'].includes(run.state)));

  const removeAgent = (agentId: string) => {
    const agent = workspace.state.agentsById[agentId];
    if (agent?.draftText && !window.confirm(`Discard the draft for ${agent.label}? An in-flight run, if any, remains visible until it finishes.`)) return;
    workspace.removeAgent(agentId);
  };

  const start = () => void workspace.audio.start();
  const stop = () => { workspace.scheduler.invalidateEpoch(); workspace.audio.stop(); };

  return <main className="min-h-[calc(100vh-5rem)] bg-[#071016] px-3 py-4 text-slate-100 sm:px-6 lg:px-8"><div className="mx-auto max-w-[1600px]">
    <header className="flex flex-col gap-4 border-b border-slate-700/70 pb-4 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Praxis · Agent Workspace</p><h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">Speak once. Let each worker decide.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">One shared finalized transcript feeds the agents you explicitly spawn. Panel selection changes what you see, not who can listen.</p></div><div className="flex flex-wrap items-center gap-2"><WorkspaceMicControls status={workspace.audio.status} paused={workspace.state.automationPaused} onStart={start} onStop={stop} onPause={() => workspace.setAutomationPaused(!workspace.state.automationPaused)} /><button type="button" onClick={() => setShowSpawn(true)} className="min-h-10 rounded border border-cyan-200/30 px-3 text-xs font-bold text-cyan-100">Spawn agent</button></div></header>
    {workspace.state.notice ? <p role="status" className="mt-3 rounded border border-amber-200/30 bg-amber-200/10 p-3 text-sm text-amber-100">{workspace.state.notice}</p> : null}
    <div className="mt-4 grid gap-4 md:grid-cols-[minmax(180px,220px)_minmax(0,1fr)] lg:grid-cols-[220px_minmax(0,1fr)_minmax(0,1fr)]">
      <AgentRail agents={workspace.state.agentOrder.map((id) => workspace.state.agentsById[id])} selectedAgentId={workspace.state.selectedAgentId} runs={workspace.state.runsById} onSelect={workspace.selectAgent} onListenChange={workspace.setAutoListen} onRemove={removeAgent} onSpawn={() => setShowSpawn(true)} />
      <div className={`min-w-0 space-y-4 ${mobileTab === 'work' ? 'hidden md:block' : ''}`}><div className="flex gap-2 md:hidden"><button type="button" onClick={() => setMobileTab('conversation')} className={`min-h-10 flex-1 rounded border px-3 text-xs font-bold ${mobileTab === 'conversation' ? 'border-cyan-200/60 text-cyan-100' : 'border-white/10 text-slate-400'}`}>Conversation</button><button type="button" onClick={() => setMobileTab('work')} className="min-h-10 flex-1 rounded border border-white/10 px-3 text-xs font-bold text-slate-400">Work</button></div><SharedTranscript segments={workspace.audio.finalizedSegments.filter((segment) => segment.final && segment.sessionId && segment.sequence).map((segment) => ({ ...segment, sessionId: segment.sessionId!, sequence: segment.sequence!, final: true as const }))} interimCaption={workspace.audio.interimCaption} onUseRecentSpeech={() => selected && workspace.useRecentSpeech(selected.id)} />{selected ? <AgentComposer agent={selected} busy={busy} run={selectedRun} onChange={(text) => workspace.setDraft(selected.id, text)} onUseSpeech={() => workspace.useRecentSpeech(selected.id)} onSubmit={() => { const agentId = selected.id; const text = selected.draftText; void workspace.submitToAgent({ agentId, text, source: 'manual' }); }} /> : <section className="rounded-lg border border-dashed border-white/15 p-5 text-sm leading-6 text-slate-400">Spawn your first agent to receive focused work. No microphone will start automatically; you can use typed submissions at any time.</section>}</div>
      <div className={`min-w-0 space-y-4 ${mobileTab === 'conversation' ? 'hidden lg:block md:hidden' : ''}`}><div className="hidden gap-2 md:flex lg:hidden"><button type="button" onClick={() => setMobileTab('conversation')} className="min-h-10 flex-1 rounded border border-white/10 px-3 text-xs font-bold text-slate-400">Conversation</button><button type="button" onClick={() => setMobileTab('work')} className="min-h-10 flex-1 rounded border border-cyan-200/60 px-3 text-xs font-bold text-cyan-100">Work</button></div>{selected ? <><div className="rounded-lg border border-white/10 bg-slate-950/35 p-4"><p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-200">Selected agent</p><h2 className="mt-1 text-xl font-bold text-white">{selected.label}</h2><p className="mt-1 text-sm leading-6 text-slate-300">{selected.assignment}</p><p className="mt-2 text-xs text-slate-500">{workspace.attentionMode === 'semantic' ? 'Semantic attention' : 'Rules-based attention'} · {workspace.assessmentCount} assessment{workspace.assessmentCount === 1 ? '' : 's'}</p></div><AgentResults run={selectedRun} onRerunWithWorker={(run, workerId) => void workspace.submitToAgent({ agentId: run.agentId, workerId, text: run.submittedText, source: 'manual', triggerId: `rerun:${run.id}:${workerId}:${Date.now()}` })} onRerunWithCommand={(run, command) => void workspace.submitToAgent({ agentId: run.agentId, text: command, source: 'manual', triggerId: `approved-listing:${run.id}:${Date.now()}` })} /><AgentActivity runs={selectedRuns} attention={workspace.state.attentionByAgentId[selected.id]} onCancel={workspace.cancelRun} onRetry={(id) => void workspace.retryRun(id)} /></> : <AgentActivity runs={[]} onCancel={() => undefined} onRetry={() => undefined} />}</div>
    </div>
    <div className="mt-4 rounded border border-white/10 bg-slate-950/30 p-3 text-xs text-slate-400">Automatic command budget: {workspace.budget.minute}/{workspace.budget.minuteLimit} this minute · {workspace.budget.hour}/{workspace.budget.hourLimit} this hour · {workspace.budget.active}/{workspace.budget.globalLimit} active. Attention assessments: {workspace.budget.assessments}/{workspace.budget.assessmentLimit} per minute. Running work remains visible when automation is paused or the microphone stops.</div>
    <CommandRouteDirectory />
    <SpawnAgentDialog open={showSpawn} workers={workspace.workers} onClose={() => setShowSpawn(false)} onSpawn={workspace.spawnAgent} />
  </div></main>;
}
