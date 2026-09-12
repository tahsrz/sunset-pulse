'use client';

import { useEffect, useRef, useState } from 'react';
import type { useJamieAudio } from '@/context/JamieAudioContext';
import { assessWithRules, getEligibleWindow, isStillEligible, transcriptWindowId } from '@/lib/agent-workspace/attentionPolicy';
import { AttentionRequestSchema, validateAttentionResponse } from '@/lib/agent-workspace/attentionDecisionSchema';
import type { AttentionDecision, CommandSubmission, WorkspaceAction, WorkspaceState } from '@/lib/agent-workspace/types';
import { SubmissionScheduler } from '@/lib/agent-workspace/submissionScheduler';
import { workspacePolicy } from '@/lib/agent-workspace/workspacePolicy';

export function useAgentAttention({ state, dispatch, audio, submitToAgent, scheduler }: {
  state: WorkspaceState;
  dispatch: React.Dispatch<WorkspaceAction>;
  audio: ReturnType<typeof useJamieAudio>;
  submitToAgent: (submission: CommandSubmission) => Promise<string | null>;
  scheduler: SubmissionScheduler;
}) {
  const [assessmentCount, setAssessmentCount] = useState(0);
  const [attentionMode, setAttentionMode] = useState<'rules' | 'semantic'>('rules');
  const [attentionUnavailableReason, setAttentionUnavailableReason] = useState<string>();
  const latest = useRef({ state, audio, submitToAgent });
  latest.current = { state, audio, submitToAgent };
  const transcriptKey = audio.finalizedSegments.filter((segment) => segment.final).map((segment) => `${segment.id}:${segment.sequence}`).join('|');
  const agentKey = state.agentOrder.map((id) => {
    const agent = state.agentsById[id];
    return `${id}:${agent.assignmentRevision}:${agent.autoListenEnabled}:${agent.transcriptCursor}`;
  }).join('|');
  const runKey = state.runOrder.map((id) => `${id}:${state.runsById[id]?.state}`).join('|');

  useEffect(() => {
    const enabled = () => {
      const current = latest.current;
      return current.audio.workspaceOwned && ['listening', 'speech-detected'].includes(current.audio.status) && !current.state.automationPaused;
    };
    if (!enabled() || !transcriptKey || !agentKey) return;
    const controller = new AbortController();
    const epoch = scheduler.getEpoch();
    let timer: number;
    const current = () => !controller.signal.aborted && epoch === scheduler.getEpoch() && enabled();

    async function assess() {
      if (!current()) return;
      const snapshot = latest.current;
      const transcript = toWorkspaceSegments(snapshot.audio.finalizedSegments);
      const eligible = snapshot.state.agentOrder.flatMap((id) => {
        const agent = snapshot.state.agentsById[id];
        const window = agent?.autoListenEnabled ? getEligibleWindow(agent, transcript) : null;
        return agent && window ? [{ agent, window }] : [];
      });
      if (!eligible.length) return;
      // Preserve each agent's own cursor/window within the bounded wire batch.
      const union = [...new Map(eligible.flatMap(({ window }) => window.segments).map((segment) => [segment.id, segment])).values()].sort((a, b) => a.sequence - b.sequence);
      while (union.length > 30 || union.reduce((sum, segment) => sum + segment.text.length, 0) > 12_000) union.shift();
      const batch = eligible.filter(({ window }) => window.segments.every((segment) => union.some((item) => item.id === segment.id)));
      if (!batch.length) return;
      let decisions: AttentionDecision[] = batch.map(({ agent, window }) => assessWithRules(agent, window));
      // Clear chatter and incomplete thoughts before spending a provider call.
      if (decisions.some((decision) => decision.action !== 'ignore' && decision.reason !== 'Waiting for the thought to finish.')) {
        const request = AttentionRequestSchema.parse({
          windowId: transcriptWindowId(union),
          agents: batch.map(({ agent, window }) => ({ id: agent.id, workerId: agent.workerId, label: agent.label, assignment: agent.assignment, assignmentRevision: agent.assignmentRevision, segmentIds: window.segments.map((segment) => segment.id) })),
          segments: union,
        });
        if (!scheduler.tryReserveAssessment()) {
          decisions = decisions.map((decision) => ({ ...decision, action: 'wait', reason: 'Assessment budget exhausted; waiting for capacity.' }));
        } else {
          setAssessmentCount((count) => count + 1);
          try {
            const response = await fetch('/api/commands/attention', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request), signal: controller.signal });
            if (!response.ok) throw new Error('Attention unavailable');
            const result = validateAttentionResponse(await response.json(), request);
            if (!current()) return;
            decisions = result.decisions.map((decision) => ({ ...decision, transcriptWindowId: batch.find(({ agent }) => agent.id === decision.agentId)!.window.windowId }));
            setAttentionMode(result.mode);
            setAttentionUnavailableReason(result.unavailableReason);
          } catch {
            if (!current()) return;
            // Access, budget and malformed-response failures must never turn
            // into automatic commands. Manual submission remains available.
            decisions = decisions.map((decision) => ({ ...decision, action: 'wait', reason: 'Attention unavailable; submit manually or wait for recovery.' }));
            setAttentionMode('rules');
            setAttentionUnavailableReason('Automatic assessment unavailable. Manual submission is still available.');
          }
        }
      }
      for (const decision of decisions) {
        if (!current()) return;
        const live = latest.current;
        const agent = live.state.agentsById[decision.agentId];
        const segments = toWorkspaceSegments(live.audio.finalizedSegments);
        const original = batch.find((entry) => entry.agent.id === decision.agentId)!;
        const eligibleWindow = agent ? getEligibleWindow(agent, segments) : null;
        if (!agent || !isStillEligible(agent, segments, decision) || JSON.stringify(eligibleWindow?.segments.map((segment) => segment.id)) !== JSON.stringify(original.window.segments.map((segment) => segment.id))) continue;
        dispatch({ type: 'SET_ATTENTION', decision });
        if (decision.action === 'ignore') {
          dispatch({ type: 'ADVANCE_CURSOR', agentId: agent.id, sequence: original.window.segments.at(-1)!.sequence });
        } else if (decision.action === 'submit') {
          const selected = original.window.segments.filter((segment) => decision.relevantSegmentIds.includes(segment.id));
          const text = selected.map((segment) => segment.text).join(' ');
          scheduler.coalesceCandidate({ agentId: agent.id, source: 'automatic', text, triggerId: decision.transcriptWindowId, assignmentRevision: agent.assignmentRevision });
          // Start independent agents together, without waiting for a response.
          void live.submitToAgent({ agentId: agent.id, text, source: 'automatic', triggerId: decision.transcriptWindowId, transcript: selected });
        }
      }
      if (current()) timer = window.setTimeout(() => void assess(), workspacePolicy.automaticCooldownMs);
    }
    timer = window.setTimeout(() => void assess(), workspacePolicy.decisionDebounceMs);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [agentKey, transcriptKey, runKey, audio.status, audio.workspaceOwned, state.automationPaused, dispatch, scheduler]);

  return { assessmentCount, attentionMode, attentionUnavailableReason };
}

function toWorkspaceSegments(segments: ReturnType<typeof useJamieAudio>['finalizedSegments']) {
  return segments.filter((segment) => segment.final && segment.sessionId && segment.sequence).map((segment) => ({ ...segment, sessionId: segment.sessionId!, sequence: segment.sequence!, final: true as const }));
}
