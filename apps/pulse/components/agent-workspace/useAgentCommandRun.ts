'use client';

import { useCallback, useEffect, useRef } from 'react';
import { readCommandStream } from '@/components/agent-console/agentConsoleCommandStream';
import type { CommandProgressEvent } from '@/components/agent-console/agentConsoleConfig';
import { buildAgentCommand } from '@/lib/agent-workspace/buildAgentCommand';
import type { AgentRun, CommandSubmission, WorkspaceAction, WorkspaceState } from '@/lib/agent-workspace/types';
import { SubmissionScheduler } from '@/lib/agent-workspace/submissionScheduler';

export function useAgentCommandRun({
  state,
  dispatch,
  scheduler,
}: {
  state: WorkspaceState;
  dispatch: React.Dispatch<WorkspaceAction>;
  scheduler: SubmissionScheduler;
}) {
  const controllersRef = useRef(new Map<string, AbortController>());
  const epochRef = useRef(0);

  const submitToAgent = useCallback(async (submission: CommandSubmission) => {
    const agent = state.agentsById[submission.agentId];
    if (!agent) {
      dispatch({ type: 'SET_NOTICE', notice: 'That agent is no longer available.' });
      return null;
    }
    const history = state.runOrder
      .map((runId) => state.runsById[runId])
      .filter((run): run is AgentRun => Boolean(run && run.agentId === agent.id && run.response))
      .slice(-3)
      .map((run) => run.response?.result.summary || '')
      .filter(Boolean);

    let commandText: string;
    try {
      commandText = buildAgentCommand({ agent, text: submission.text, transcript: submission.transcript, history });
    } catch (error) {
      dispatch({ type: 'SET_NOTICE', notice: error instanceof Error ? error.message : 'This request is too large.' });
      return null;
    }

    const reservationResult = scheduler.tryReserve({
      agentId: agent.id,
      source: submission.source,
      text: submission.text,
      triggerId: submission.triggerId,
      assignmentRevision: agent.assignmentRevision,
    });
    if (!reservationResult.ok) {
      dispatch({ type: 'SET_NOTICE', notice: reservationResult.reason });
      return reservationResult.existingRunId || null;
    }
    const reservation = reservationResult.reservation;
    if (reservation.started) return reservation.runId;
    if (!scheduler.start(reservation.runId)) {
      dispatch({ type: 'SET_NOTICE', notice: 'This request became stale before it could start.' });
      return null;
    }

    const controller = new AbortController();
    const requestEpoch = epochRef.current;
    controllersRef.current.set(reservation.runId, controller);
    const run: AgentRun = {
      id: reservation.runId,
      agentId: agent.id,
      triggerId: submission.triggerId,
      source: submission.source,
      submittedText: submission.text,
      commandText,
      state: 'running',
      progress: [{ id: 'submitted', label: 'Request received', status: 'complete', detail: agent.label }],
      startedAt: Date.now(),
    };
    dispatch({ type: 'RUN_STARTED', run });

    try {
      const response = await fetch('/api/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({
          command: commandText,
          selectedWorkerId: agent.workerId,
          relayMode: submission.relayMode || 'briefing',
          supervisor: submission.supervisor ?? true,
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        let message = 'Command execution failed.';
        try { message = (await response.json())?.error || message; } catch { /* non-JSON error */ }
        throw new Error(message);
      }
      const result = await readCommandStream(response, (progress: CommandProgressEvent) => {
        if (epochRef.current !== requestEpoch || controller.signal.aborted) return;
        dispatch({ type: 'RUN_PROGRESS', runId: run.id, agentId: agent.id, progress });
      });
      if (epochRef.current === requestEpoch && !controller.signal.aborted) {
        dispatch({ type: 'RUN_COMPLETED', runId: run.id, agentId: agent.id, response: result, finishedAt: Date.now() });
      }
      return run.id;
    } catch (error) {
      if (controller.signal.aborted) {
        dispatch({ type: 'RUN_CANCELLED', runId: run.id, agentId: agent.id, finishedAt: Date.now() });
      } else {
        dispatch({ type: 'RUN_FAILED', runId: run.id, agentId: agent.id, error: error instanceof Error ? error.message : 'Command execution failed.', finishedAt: Date.now() });
      }
      return run.id;
    } finally {
      controllersRef.current.delete(run.id);
      scheduler.completeRun(run.id);
    }
  }, [dispatch, scheduler, state]);

  const cancelRun = useCallback((runId: string) => controllersRef.current.get(runId)?.abort(), []);
  const retryRun = useCallback((runId: string) => {
    const run = state.runsById[runId];
    if (!run) return null;
    return submitToAgent({ agentId: run.agentId, text: run.submittedText, source: 'manual', triggerId: `retry:${run.id}:${Date.now()}` });
  }, [state.runsById, submitToAgent]);

  useEffect(() => () => {
    epochRef.current += 1;
    for (const controller of controllersRef.current.values()) controller.abort();
    scheduler.invalidateEpoch();
  }, [scheduler]);

  return { submitToAgent, cancelRun, retryRun };
}
