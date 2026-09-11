'use client';

import { useEffect, useRef, useState } from 'react';
import type { useJamieAudio } from '@/context/JamieAudioContext';
import { assessWithRules, getEligibleWindow, isStillEligible } from '@/lib/agent-workspace/attentionPolicy';
import type { AttentionResponse } from '@/lib/agent-workspace/attentionDecisionSchema';
import type { AttentionDecision, CommandSubmission, WorkspaceAction, WorkspaceState } from '@/lib/agent-workspace/types';
import { SubmissionScheduler } from '@/lib/agent-workspace/submissionScheduler';
import { workspacePolicy } from '@/lib/agent-workspace/workspacePolicy';

export function useAgentAttention({
  state,
  dispatch,
  audio,
  submitToAgent,
  scheduler,
}: {
  state: WorkspaceState;
  dispatch: React.Dispatch<WorkspaceAction>;
  audio: ReturnType<typeof useJamieAudio>;
  submitToAgent: (submission: CommandSubmission) => Promise<string | null>;
  scheduler: SubmissionScheduler;
}) {
  const [assessmentCount, setAssessmentCount] = useState(0);
  const [attentionMode, setAttentionMode] = useState<'rules' | 'semantic'>('rules');
  const latestRef = useRef({ state, audio });
  latestRef.current = { state, audio };
  const transcriptKey = audio.finalizedSegments.map((segment) => `${segment.id}:${segment.sequence}`).join('|');
  const agentKey = state.agentOrder.map((id) => `${id}:${state.agentsById[id]?.assignmentRevision}:${state.agentsById[id]?.autoListenEnabled}`).join('|');
  const runStateKey = state.runOrder.map((id) => `${id}:${state.runsById[id]?.state}`).join('|');

  useEffect(() => {
    if (audio.workspaceOwned === false || !['listening', 'speech-detected'].includes(audio.status) || state.automationPaused || !transcriptKey || !agentKey) return;
    const timer = window.setTimeout(() => {
      void assessEligibleAgents();
    }, workspacePolicy.decisionDebounceMs);
    return () => window.clearTimeout(timer);
    // The keys intentionally exclude interim captions and running output.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audio.status, audio.workspaceOwned, agentKey, runStateKey, state.automationPaused, transcriptKey]);

  async function assessEligibleAgents() {
    const snapshot = latestRef.current;
    const transcript = toWorkspaceSegments(snapshot.audio.finalizedSegments);
    const eligible = snapshot.state.agentOrder
      .map((id) => snapshot.state.agentsById[id])
      .filter((agent) => agent?.autoListenEnabled)
      .map((agent) => ({ agent, window: getEligibleWindow(agent, transcript) }))
      .filter((entry): entry is { agent: NonNullable<typeof entry.agent>; window: NonNullable<typeof entry.window> } => Boolean(entry.agent && entry.window));
    if (!eligible.length) return;

    const assessmentId = crypto.randomUUID();
    let decisions: AttentionDecision[] = [];
    if (!scheduler.tryReserveAssessment()) {
      setAttentionMode('rules');
      decisions = eligible.map(({ agent, window }) => {
        const decision = assessWithRules(agent, window);
        return decision.action === 'submit' ? { ...decision, action: 'wait' as const, reason: 'Assessment budget is exhausted; waiting is safer than starting work.' } : decision;
      });
      for (const decision of decisions) dispatch({ type: 'SET_ATTENTION', decision });
      return;
    }
    setAssessmentCount((count) => count + 1);
    try {
      const response = await fetch('/api/commands/attention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          windowId: eligible[0].window.windowId,
          agents: eligible.map(({ agent }) => ({ id: agent.id, workerId: agent.workerId, label: agent.label, assignment: agent.assignment, assignmentRevision: agent.assignmentRevision })),
          segments: eligible[0].window.segments,
        }),
      });
      if (!response.ok) throw new Error('Attention assessment unavailable.');
      const payload = await response.json() as AttentionResponse;
      decisions = payload.decisions;
      setAttentionMode(payload.mode === 'semantic' ? 'semantic' : 'rules');
    } catch {
      setAttentionMode('rules');
      decisions = eligible.map(({ agent, window }) => assessWithRules(agent, window));
    }

    for (const decision of decisions) {
      const current = latestRef.current;
      const agent = current.state.agentsById[decision.agentId];
      const currentTranscript = toWorkspaceSegments(current.audio.finalizedSegments);
      if (!agent || !isStillEligible(agent, currentTranscript, decision) || current.state.automationPaused || current.audio.workspaceOwned === false) continue;
      dispatch({ type: 'SET_ATTENTION', decision: { ...decision, mode: decision.mode || attentionMode } });
      if (decision.action === 'ignore') {
        const sequence = Math.max(...decision.relevantSegmentIds.map((id) => current.audio.finalizedSegments.find((segment) => segment.id === id)?.sequence || 0));
        if (sequence) dispatch({ type: 'ADVANCE_CURSOR', agentId: agent.id, sequence });
        continue;
      }
      if (decision.action !== 'submit') continue;
      const selected = decision.relevantSegmentIds.map((id) => currentTranscript.find((segment) => segment.id === id)).filter(Boolean).map((segment) => segment!.text).join(' ');
      if (!selected) continue;
      scheduler.coalesceCandidate({ agentId: agent.id, source: 'automatic', text: selected, triggerId: decision.transcriptWindowId, assignmentRevision: agent.assignmentRevision });
      await submitToAgent({ agentId: agent.id, text: selected, source: 'automatic', triggerId: decision.transcriptWindowId, transcript: currentTranscript.filter((segment) => decision.relevantSegmentIds.includes(segment.id)) });
    }
    void assessmentId;
  }

  return { assessmentCount, attentionMode };
}

function toWorkspaceSegments(segments: ReturnType<typeof useJamieAudio>['finalizedSegments']) {
  return segments.filter((segment) => segment.sessionId && segment.sequence).map((segment) => ({ ...segment, sessionId: segment.sessionId!, sequence: segment.sequence!, final: true as const }));
}
