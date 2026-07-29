'use client';

import Link from 'next/link';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import {
  starterJobs,
  type SavedExample,
} from './agentConsoleConfig';
import { AgentConsoleOutputPanel } from './AgentConsoleOutputPanel';
import { AgentConsoleSavedExamplesLibrary } from './AgentConsoleSavedExamplesLibrary';
import { AgentConsoleWorkflowForm } from './AgentConsoleWorkflowForm';
import { trackAgentConsoleEvent } from './agentConsoleEvents';
import { useAgentConsolePreferences } from './useAgentConsolePreferences';
import { useAgentConsoleRun } from './useAgentConsoleRun';
import { useAgentConsoleSavedExamples } from './useAgentConsoleSavedExamples';

export default function AgentConsole() {
  const [selectedJobId, setSelectedJobId] = useState(starterJobs[0].id);
  const [draft, setDraft] = useState('');

  const selectedJob = useMemo(
    () => starterJobs.find((job) => job.id === selectedJobId) || starterJobs[0],
    [selectedJobId],
  );
  const {
    openPreferences,
    preferences,
    preferencesOpen,
    savePreferences,
    updatePreference,
  } = useAgentConsolePreferences(selectedJob);

  const {
    copySavedExample,
    deleteSavedExample,
    exampleLibrary,
    getSavedExampleCount,
    loadSavedExample,
    saveResultExample: saveCurrentResultExample,
    savedExamples,
    selectedExamples,
  } = useAgentConsoleSavedExamples(selectedJob);

  const {
    copied,
    copyResult,
    currentInput,
    error,
    markResultSaved,
    progress,
    resetRunOutput,
    result,
    runAgentJob,
    running,
    savedResult,
  } = useAgentConsoleRun({
    preferences,
    selectedExamplesCount: selectedExamples.length,
    selectedJob,
  });

  useEffect(() => {
    trackAgentConsoleEvent({
      event: 'console_opened',
      jobId: selectedJob.id,
      workerId: selectedJob.workerId,
    });
  }, []);

  const handleSelectJob = (jobId: string, trackSelection = true) => {
    const nextJob = starterJobs.find((job) => job.id === jobId) || starterJobs[0];
    setSelectedJobId(nextJob.id);
    resetRunOutput();
    if (trackSelection) {
      trackAgentConsoleEvent({
        event: 'job_selected',
        hasInput: Boolean(draft.trim()),
        inputLength: draft.trim().length,
        jobId: nextJob.id,
        savedExampleCount: getSavedExampleCount(nextJob.id),
        workerId: nextJob.workerId,
      });
    }
  };

  const handleSubmitAgentJob = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runAgentJob(draft);
  };

  const handleLoadSelectedJobExample = () => {
    setDraft(selectedJob.example);
    resetRunOutput();
    trackAgentConsoleEvent({
      event: 'example_loaded',
      hasInput: true,
      inputLength: selectedJob.example.length,
      jobId: selectedJob.id,
      workerId: selectedJob.workerId,
    });
  };

  const handleSaveResultExample = () => {
    saveCurrentResultExample({
      currentInput,
      onSaved: markResultSaved,
      result,
    });
  };

  const handleUseSavedExample = (example: SavedExample) => {
    const loadedExample = loadSavedExample(example);
    handleSelectJob(loadedExample.jobId, false);
    setDraft(loadedExample.input);
    resetRunOutput();
  };

  return (
    <main className="min-h-screen bg-[#f6f7f2] text-[#17201f]">
      <section className="border-b border-[#c9d3ca] bg-[#fffdf7] px-4 pt-24 pb-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div>
            <p className="text-sm font-semibold text-[#517268]">Sunset Pulse</p>
            <h1 className="mt-1 text-3xl font-bold text-[#111817] sm:text-4xl">Agent Console</h1>
          </div>
        </div>
      </section>

      <section className="px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-4xl gap-5">
          <div className="grid gap-5">
            <AgentConsoleWorkflowForm
              draft={draft}
              onDraftChange={setDraft}
              onExampleLoad={handleLoadSelectedJobExample}
              onPreferenceChange={updatePreference}
              onPreferencesOpen={openPreferences}
              onRun={handleSubmitAgentJob}
              onSavePreferences={savePreferences}
              onSelectJob={handleSelectJob}
              preferences={preferences}
              preferencesOpen={preferencesOpen}
              running={running}
              selectedExamplesCount={selectedExamples.length}
              selectedJob={selectedJob}
            />

            <AgentConsoleSavedExamplesLibrary
              examples={exampleLibrary}
              onCopy={copySavedExample}
              onDelete={deleteSavedExample}
              onUse={handleUseSavedExample}
              selectedJobId={selectedJob.id}
              totalCount={savedExamples.length}
            />

            <AgentConsoleOutputPanel
              copied={copied}
              error={error}
              onCopy={copyResult}
              onSave={handleSaveResultExample}
              progress={progress}
              result={result}
              running={running}
              saved={savedResult}
              selectedJob={selectedJob}
            />

            <div className="flex justify-center">
              <Link
                href="/command-center"
                onClick={() => trackAgentConsoleEvent({
                  event: 'advanced_opened',
                  jobId: selectedJob.id,
                  workerId: selectedJob.workerId,
                })}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-xs font-semibold text-[#517268] hover:bg-[#eef5f1] hover:text-[#24312f] focus:outline-none focus:ring-2 focus:ring-[#789184]"
              >
                <Sparkles size={14} />
                Full Command Center
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
