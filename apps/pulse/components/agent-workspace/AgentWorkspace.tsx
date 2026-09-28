'use client';

import React, { useState } from 'react';
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
  const [tab, setTab] = useState<'agents' | 'conversation' | 'work'>('conversation');
  const [selectedRunIds, setSelectedRunIds] = useState<Record<string, string>>({});
  const selected = workspace.state.selectedAgentId ? workspace.state.agentsById[workspace.state.selectedAgentId] : undefined;
  const selectedRuns = workspace.state.runOrder.map((id) => workspace.state.runsById[id]).filter((run) => selected ? run.agentId === selected.id : !workspace.state.agentsById[run.agentId]);
  const selectedRun = selectedRuns.find((run) => run.id === selectedRunIds[selected?.id || 'archived']) || selectedRuns.at(-1);
  const busy = selectedRuns.some((run) => ['queued', 'running'].includes(run.state));
  const removeAgent = (agentId: string) => {
    const agent = workspace.state.agentsById[agentId];
    if (agent?.draftText && !window.confirm(`Discard the draft for ${agent.label}? Its runs remain in removed-agent history.`)) return;
    workspace.removeAgent(agentId);
  };
  const selectRun = (runId: string) => {
    setSelectedRunIds((previous) => ({ ...previous, [selected?.id || 'archived']: runId }));
    setTab('work');
  };

  return <div className="min-h-[calc(100vh-5rem)] bg-[#071016] px-3 py-4 text-slate-100 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-[1600px]">
      <header className="flex flex-col gap-4 border-b border-slate-700/70 pb-4 min-[1100px]:flex-row min-[1100px]:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Praxis · Agent Workspace</p>
          <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">Speak once. Let each worker decide.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">One shared finalized transcript feeds the agents you explicitly spawn. Panel selection changes what you see, not who can listen.</p>
          <a href="/command-center?legacy=1" className="text-xs text-cyan-100 underline">Open classic Command Center for the full review and publishing workflow</a>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <WorkspaceMicControls status={workspace.audio.status} paused={workspace.state.automationPaused} onStart={() => void workspace.audio.start()} onStop={() => { workspace.scheduler.invalidateEpoch(); workspace.audio.stop(); }} onPause={() => workspace.setAutomationPaused(!workspace.state.automationPaused)} />
          <button type="button" onClick={() => setShowSpawn(true)} className="min-h-10 rounded border border-cyan-200/30 px-3 text-xs font-bold text-cyan-100">Spawn agent</button>
        </div>
      </header>
      {workspace.state.notice ? <p role="status" className="mt-3 rounded border border-amber-200/30 p-3 text-sm text-amber-100">{workspace.state.notice}</p> : null}
      {/* Controls stay outside all switchable panels, including at tablet widths. */}
      <nav aria-label="Workspace views" className="mt-4 flex gap-2 min-[1100px]:hidden">
        {(['agents', 'conversation', 'work'] as const).map((name) => <button key={name} type="button" aria-pressed={tab === name} aria-controls={`workspace-${name}`} onClick={() => setTab(name)} className={`min-h-11 flex-1 rounded border px-3 text-sm capitalize focus-visible:outline focus-visible:outline-cyan-200 ${name === 'agents' ? 'md:hidden' : ''} ${tab === name ? 'border-cyan-200 text-cyan-100' : 'border-white/20 text-slate-300'}`}>{name}</button>)}
      </nav>
      <div className="mt-4 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)] min-[1100px]:grid-cols-[220px_minmax(0,1fr)_minmax(0,1fr)]">
        <div id="workspace-agents" className={`min-w-0 ${tab !== 'agents' ? 'hidden md:block' : ''}`}>
          <AgentRail agents={workspace.state.agentOrder.map((id) => workspace.state.agentsById[id])} selectedAgentId={workspace.state.selectedAgentId} runs={workspace.state.runsById} onSelect={(id) => { workspace.selectAgent(id); setTab('conversation'); }} onListenChange={workspace.setAutoListen} onRemove={removeAgent} onSpawn={() => setShowSpawn(true)} />
          {workspace.state.runOrder.some((id) => !workspace.state.agentsById[workspace.state.runsById[id].agentId]) ? <button type="button" className="mt-3 text-sm text-cyan-100 underline" onClick={() => { workspace.selectAgent(null); setTab('work'); }}>Removed-agent history</button> : null}
        </div>
        <div id="workspace-conversation" className={`min-w-0 space-y-4 ${tab === 'conversation' ? '' : tab === 'agents' ? 'hidden md:block' : 'hidden min-[1100px]:block'}`}>
          <SharedTranscript segments={workspace.audio.finalizedSegments.filter((segment) => segment.final && segment.sessionId && segment.sequence).map((segment) => ({ ...segment, sessionId: segment.sessionId!, sequence: segment.sequence!, final: true as const }))} interimCaption={workspace.audio.interimCaption} onUseRecentSpeech={() => selected && workspace.useRecentSpeech(selected.id)} />
          {selected ? <AgentComposer agent={selected} busy={busy} run={selectedRun} onChange={(text) => workspace.setDraft(selected.id, text)} onUseSpeech={() => workspace.useRecentSpeech(selected.id)} onSubmit={() => { void workspace.submitToAgent({ agentId: selected.id, text: selected.draftText, source: 'manual' }); setSelectedRunIds((previous) => { const next = { ...previous }; delete next[selected.id]; return next; }); setTab('work'); }} /> : <section className="rounded-lg border border-dashed border-white/15 p-5 text-sm text-slate-400">Spawn your first agent to receive focused work. The microphone will not start automatically; typed submissions work without it.</section>}
        </div>
        <div id="workspace-work" className={`min-w-0 space-y-4 ${tab !== 'work' ? 'hidden min-[1100px]:block' : ''}`}>
          {selected ? <div className="rounded-lg border border-white/10 p-4">
            <h2 className="text-xl font-bold">{selected.label}</h2><p className="mt-1 text-sm text-slate-300">{selected.assignment}</p>
            <p className="mt-2 text-xs text-slate-400">{workspace.attentionMode === 'semantic' ? 'Semantic attention' : 'Rules-based attention'} · {workspace.assessmentCount} assessments</p>
            {workspace.attentionUnavailableReason ? <p className="mt-2 text-xs text-amber-100">{workspace.attentionUnavailableReason}</p> : null}
          </div> : null}
          <AgentResults key={selectedRun?.id || selected?.id || 'empty'} run={selectedRun}
            onActionItem={async (run, item) => { if (item.kind === 'command' && item.command && workspace.state.agentsById[run.agentId]) { workspace.setDraft(run.agentId, item.command); workspace.selectAgent(run.agentId); setTab('conversation'); } }}
            onRerunWithWorker={(run, workerId) => void workspace.submitToAgent({ agentId: run.agentId, workerId, text: run.submittedText, source: 'manual', retryOfRunId: run.id, triggerId: `rerun:${run.id}:${crypto.randomUUID()}` })}
            onRerunWithCommand={(run, command) => void workspace.submitToAgent({ agentId: run.agentId, text: command, source: 'manual', relayMode: run.request?.relayMode, supervisor: run.request?.supervisor, triggerId: `approved-listing:${run.id}:${crypto.randomUUID()}` })} />
          <AgentActivity runs={selectedRuns} attention={selected ? workspace.state.attentionByAgentId[selected.id] : undefined} selectedRunId={selectedRun?.id} onSelectRun={selectRun} onCancel={workspace.cancelRun} onRetry={(id) => void workspace.retryRun(id)} />
        </div>
      </div>
      <div className="mt-4 rounded border border-white/10 p-3 text-xs text-slate-400">Automatic budget: {workspace.budget.minute}/{workspace.budget.minuteLimit} this minute · {workspace.budget.hour}/{workspace.budget.hourLimit} this hour · {workspace.budget.active}/{workspace.budget.globalLimit} active. Cancelled or uncertain requests retain capacity for up to five minutes.</div>
      <CommandRouteDirectory />
      <SpawnAgentDialog open={showSpawn} workers={workspace.workers} onClose={() => setShowSpawn(false)} onSpawn={(input) => { workspace.spawnAgent(input); setTab('conversation'); }} />
    </div>
  </div>;
}
