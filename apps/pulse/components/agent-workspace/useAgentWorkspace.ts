'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useJamieAudio } from '@/context/JamieAudioContext';
import { useAuth } from '@/context/AuthContext';
import { intelligenceWorkers } from '@/lib/command-center/workerRoster';
import { initialWorkspaceState, workspaceReducer } from '@/lib/agent-workspace/workspaceReducer';
import type { AgentSession } from '@/lib/agent-workspace/types';
import { SubmissionScheduler } from '@/lib/agent-workspace/submissionScheduler';
import { workspacePolicy } from '@/lib/agent-workspace/workspacePolicy';
import { loadWorkspacePreferences, saveWorkspacePreferences } from '@/lib/agent-workspace/workspacePreferences';
import { useAgentAttention } from './useAgentAttention';
import { useAgentCommandRun } from './useAgentCommandRun';

export function useAgentWorkspace() {
  const [state, dispatch] = useReducer(workspaceReducer, initialWorkspaceState);
  const audio = useJamieAudio();
  const { user } = useAuth();
  const accountId = (user as { id?: string } | null)?.id || 'anonymous';
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  const [scheduler] = useState(() => new SubmissionScheduler(() => stateRef.current.agentsById, () => stateRef.current.automationPaused));
  const { submitToAgent, cancelRun, retryRun } = useAgentCommandRun({ state, dispatch, scheduler });
  const { attentionMode, assessmentCount } = useAgentAttention({ state, dispatch, audio, submitToAgent, scheduler });

  useEffect(() => {
    const token = audio.acquireWorkspaceOwnership();
    return () => audio.releaseWorkspaceOwnership(token);
    // The lease callbacks are stable; depending on the changing audio snapshot
    // would release and reacquire ownership on every transcript update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audio.acquireWorkspaceOwnership, audio.releaseWorkspaceOwnership]);

  useEffect(() => {
    const restored = loadWorkspacePreferences(accountId).map((stored) => ({
      ...stored,
      assignmentRevision: 1,
      autoListenEnabled: false,
      spawnedAtSequence: Math.max(0, ...audio.finalizedSegments.map((segment) => segment.sequence || 0)),
      draftText: '',
      draftDirty: false,
      draftRevision: 0,
      transcriptCursor: Math.max(0, ...audio.finalizedSegments.map((segment) => segment.sequence || 0)),
    }));
    if (restored.length) dispatch({ type: 'RESTORE_AGENTS', agents: restored });
    setPreferencesLoaded(true);
    // Restore only role/label/assignment. Capture and running state are never persisted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  useEffect(() => {
    if (preferencesLoaded) saveWorkspacePreferences(accountId, state.agentOrder.map((id) => state.agentsById[id]));
  }, [accountId, preferencesLoaded, state.agentOrder, state.agentsById]);

  const spawnAgent = useCallback(({ workerId, label, assignment, autoListenEnabled }: { workerId: string; label?: string; assignment?: string; autoListenEnabled?: boolean }) => {
    if (stateRef.current.agentOrder.length >= workspacePolicy.maxAgents) {
      dispatch({ type: 'SET_NOTICE', notice: `This workspace supports up to ${workspacePolicy.maxAgents} spawned agents.` });
      return null;
    }
    const worker = intelligenceWorkers.find((candidate) => candidate.id === workerId);
    if (!worker) return null;
    const agent: AgentSession = {
      id: crypto.randomUUID(),
      workerId,
      label: label?.trim() || worker.name,
      assignment: assignment?.trim() || worker.role,
      assignmentRevision: 1,
      autoListenEnabled: Boolean(autoListenEnabled),
      spawnedAtSequence: Math.max(0, ...audio.finalizedSegments.map((segment) => segment.sequence || 0)),
      draftText: '',
      draftDirty: false,
      draftRevision: 0,
      transcriptCursor: Math.max(0, ...audio.finalizedSegments.map((segment) => segment.sequence || 0)),
    };
    dispatch({ type: 'SPAWN_AGENT', agent });
    return agent.id;
  }, [audio.finalizedSegments]);

  const removeAgent = useCallback((agentId: string) => {
    scheduler.removeAgent(agentId);
    dispatch({ type: 'REMOVE_AGENT', agentId });
  }, [scheduler]);
  const selectAgent = useCallback((agentId: string) => dispatch({ type: 'SELECT_AGENT', agentId }), []);

  const setAutoListen = useCallback((agentId: string, enabled: boolean) => dispatch({ type: 'SET_AUTO_LISTEN', agentId, enabled }), []);
  const setDraft = useCallback((agentId: string, text: string) => dispatch({ type: 'SET_DRAFT', agentId, text, dirty: true }), []);
  const useRecentSpeech = useCallback((agentId: string) => dispatch({ type: 'USE_RECENT_SPEECH', agentId, text: audio.finalizedSegments.map((segment) => segment.text).join(' ') }), [audio.finalizedSegments]);
  const setAutomationPaused = useCallback((paused: boolean) => {
    if (paused) scheduler.invalidateEpoch();
    dispatch({ type: 'SET_AUTOMATION_PAUSED', paused });
  }, [scheduler]);

  return {
    state,
    audio,
    workers: intelligenceWorkers,
    scheduler,
    attentionMode,
    assessmentCount,
    spawnAgent,
    removeAgent,
    selectAgent,
    setAutoListen,
    setDraft,
    useRecentSpeech,
    setAutomationPaused,
    submitToAgent,
    cancelRun,
    retryRun,
    budget: scheduler.getBudgetState(),
  };
}
