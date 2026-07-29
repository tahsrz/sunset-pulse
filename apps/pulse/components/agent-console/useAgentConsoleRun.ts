'use client';

import { useState } from 'react';
import {
  type AgentPreferences,
  type CommandResponse,
  idleProgress,
  type StarterJob,
} from './agentConsoleConfig';
import { readCommandStream } from './agentConsoleCommandStream';
import { trackAgentConsoleEvent } from './agentConsoleEvents';
import { upsertProgressEvent } from './agentConsoleProgress';
import { formatAgentPreferences } from './agentConsoleStorage';

type UseAgentConsoleRunOptions = {
  preferences: AgentPreferences;
  selectedExamplesCount: number;
  selectedJob: StarterJob;
};

export function useAgentConsoleRun({
  preferences,
  selectedExamplesCount,
  selectedJob,
}: UseAgentConsoleRunOptions) {
  const [currentInput, setCurrentInput] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CommandResponse | null>(null);
  const [progress, setProgress] = useState(idleProgress);
  const [copied, setCopied] = useState(false);
  const [savedResult, setSavedResult] = useState(false);

  const resetRunOutput = () => {
    setError(null);
    setResult(null);
    setCopied(false);
    setSavedResult(false);
  };

  const runAgentJob = async (rawInput: string) => {
    const trimmed = rawInput.trim();
    if (!trimmed || running) return;
    const startedAt = Date.now();

    setRunning(true);
    setError(null);
    setResult(null);
    setCopied(false);
    setSavedResult(false);
    setCurrentInput(trimmed);
    setProgress([
      { id: 'submitted', label: 'Request received', status: 'complete', detail: selectedJob.label },
      { id: 'voice', label: 'Applying your voice', status: 'running', detail: preferences.tone },
      { id: 'draft', label: 'Drafting answer', status: 'pending', detail: selectedJob.outputLabel },
    ]);
    trackAgentConsoleEvent({
      event: 'run_submitted',
      hasInput: true,
      inputLength: trimmed.length,
      jobId: selectedJob.id,
      savedExampleCount: selectedExamplesCount,
      workerId: selectedJob.workerId,
    });

    try {
      const response = await fetch('/api/commands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          command: `${selectedJob.prompt}\n\nAgent voice baseline:\n${formatAgentPreferences(preferences)}\n\nInput:\n${trimmed}`,
          selectedWorkerId: selectedJob.workerId,
          relayMode: selectedJob.relayMode,
          supervisor: true,
        }),
      });

      if (!response.ok) {
        const body = await safeJson(response);
        throw new Error(body?.error || 'Jamie could not finish that job.');
      }

      const commandResult = await readCommandStream(response, (event) => {
        setProgress((current) => upsertProgressEvent(current, event));
      });
      setResult(commandResult);
      setProgress(commandResult.trace?.progress || [{ id: 'complete', label: 'Complete', status: 'complete' }]);
      trackAgentConsoleEvent({
        commandId: commandResult.commandId,
        durationMs: Date.now() - startedAt,
        event: 'run_completed',
        hasInput: true,
        inputLength: trimmed.length,
        jobId: selectedJob.id,
        resultLength: commandResult.result.deliverable.copyReadyText.length,
        workerId: selectedJob.workerId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Jamie could not finish that job.');
      trackAgentConsoleEvent({
        durationMs: Date.now() - startedAt,
        event: 'run_failed',
        hasInput: true,
        inputLength: trimmed.length,
        jobId: selectedJob.id,
        workerId: selectedJob.workerId,
      });
    } finally {
      setRunning(false);
    }
  };

  const copyResult = async () => {
    const text = result?.result.deliverable.copyReadyText;
    if (!text) return;

    await navigator.clipboard.writeText(text);
    setCopied(true);
    trackAgentConsoleEvent({
      commandId: result?.commandId,
      event: 'result_copied',
      jobId: selectedJob.id,
      resultLength: text.length,
      workerId: selectedJob.workerId,
    });
    window.setTimeout(() => setCopied(false), 1600);
  };

  return {
    copied,
    copyResult,
    currentInput,
    error,
    markResultSaved: () => setSavedResult(true),
    progress,
    resetRunOutput,
    result,
    runAgentJob,
    running,
    savedResult,
  };
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
