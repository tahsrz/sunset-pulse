'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  savedExamplesStorageKey,
  starterJobs,
  type CommandResponse,
  type SavedExample,
  type StarterJob,
} from './agentConsoleConfig';
import { trackAgentConsoleEvent } from './agentConsoleEvents';
import { restoreSavedExamples } from './agentConsoleStorage';

type SaveResultExampleInput = {
  currentInput: string;
  result: CommandResponse | null;
  onSaved: () => void;
};

export function useAgentConsoleSavedExamples(selectedJob: StarterJob) {
  const [savedExamples, setSavedExamples] = useState<SavedExample[]>([]);

  useEffect(() => {
    setSavedExamples(restoreSavedExamples(localStorage.getItem(savedExamplesStorageKey)));
  }, []);

  const selectedExamples = useMemo(
    () => savedExamples.filter((example) => example.jobId === selectedJob.id),
    [savedExamples, selectedJob.id],
  );

  const persistExamples = (nextExamples: SavedExample[]) => {
    setSavedExamples(nextExamples);
    localStorage.setItem(savedExamplesStorageKey, JSON.stringify(nextExamples));
  };

  const getSavedExampleCount = (jobId: string) => (
    savedExamples.filter((example) => example.jobId === jobId).length
  );

  const saveResultExample = ({
    currentInput,
    onSaved,
    result,
  }: SaveResultExampleInput) => {
    const output = result?.result.deliverable.copyReadyText.trim();
    const input = currentInput.trim();
    if (!output || !input) return;

    const nextExample: SavedExample = {
      id: crypto.randomUUID(),
      jobId: selectedJob.id,
      title: result?.result.deliverable.title || selectedJob.label,
      input,
      output,
      createdAt: new Date().toISOString(),
    };
    const nextExamples = [nextExample, ...savedExamples].slice(0, 12);
    persistExamples(nextExamples);
    onSaved();
    trackAgentConsoleEvent({
      commandId: result?.commandId,
      event: 'result_saved',
      hasInput: true,
      inputLength: input.length,
      jobId: selectedJob.id,
      resultLength: output.length,
      savedExampleCount: nextExamples.length,
      workerId: selectedJob.workerId,
    });
  };

  const deleteSavedExample = (id: string) => {
    const deletedExample = savedExamples.find((example) => example.id === id);
    const nextExamples = savedExamples.filter((example) => example.id !== id);
    persistExamples(nextExamples);
    trackAgentConsoleEvent({
      event: 'saved_example_deleted',
      jobId: deletedExample?.jobId || selectedJob.id,
      savedExampleCount: nextExamples.length,
      workerId: selectedJob.workerId,
    });
  };

  const loadSavedExample = (example: SavedExample) => {
    const matchingJob = starterJobs.find((job) => job.id === example.jobId);
    trackAgentConsoleEvent({
      event: 'saved_example_used',
      hasInput: true,
      inputLength: example.input.length,
      jobId: example.jobId,
      resultLength: example.output.length,
      workerId: matchingJob?.workerId,
    });

    return {
      input: example.input,
      jobId: example.jobId,
    };
  };

  const copySavedExample = async (example: SavedExample) => {
    const matchingJob = starterJobs.find((job) => job.id === example.jobId);
    await navigator.clipboard.writeText(example.output);
    trackAgentConsoleEvent({
      event: 'saved_example_copied',
      jobId: example.jobId,
      resultLength: example.output.length,
      workerId: matchingJob?.workerId,
    });
  };

  return {
    copySavedExample,
    deleteSavedExample,
    getSavedExampleCount,
    loadSavedExample,
    saveResultExample,
    savedExamples,
    selectedExamples,
  };
}
