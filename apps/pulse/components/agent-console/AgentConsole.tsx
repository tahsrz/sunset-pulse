'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clipboard,
  Copy,
  Save,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  ctaOptions,
  defaultPreferences,
  idleProgress,
  preferencesStorageKey,
  savedExamplesStorageKey,
  starterJobs,
  toneOptions,
  type AgentPreferences,
  type CommandProgressEvent,
  type CommandResponse,
  type SavedExample,
  type StarterJob,
} from './agentConsoleConfig';
import {
  formatAgentPreferences,
  normalizePreferences,
  restoreAgentPreferences,
  restoreSavedExamples,
} from './agentConsoleStorage';
import { trackAgentConsoleEvent } from './agentConsoleEvents';

export default function AgentConsole() {
  const [selectedJobId, setSelectedJobId] = useState(starterJobs[0].id);
  const [draft, setDraft] = useState('');
  const [currentInput, setCurrentInput] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CommandResponse | null>(null);
  const [progress, setProgress] = useState<CommandProgressEvent[]>(idleProgress);
  const [copied, setCopied] = useState(false);
  const [savedResult, setSavedResult] = useState(false);
  const [preferences, setPreferences] = useState<AgentPreferences>(defaultPreferences);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [savedExamples, setSavedExamples] = useState<SavedExample[]>([]);

  const selectedJob = useMemo(
    () => starterJobs.find((job) => job.id === selectedJobId) || starterJobs[0],
    [selectedJobId],
  );

  const selectedExamples = useMemo(
    () => savedExamples.filter((example) => example.jobId === selectedJob.id),
    [savedExamples, selectedJob.id],
  );

  const exampleLibrary = useMemo(
    () => [
      ...savedExamples.filter((example) => example.jobId === selectedJob.id),
      ...savedExamples.filter((example) => example.jobId !== selectedJob.id),
    ].slice(0, 5),
    [savedExamples, selectedJob.id],
  );

  useEffect(() => {
    trackAgentConsoleEvent({
      event: 'console_opened',
      jobId: selectedJob.id,
      workerId: selectedJob.workerId,
    });

    const restoredPreferences = restoreAgentPreferences(localStorage.getItem(preferencesStorageKey));
    if (restoredPreferences) {
      setPreferences(restoredPreferences);
    }

    const restoredExamples = restoreSavedExamples(localStorage.getItem(savedExamplesStorageKey));
    setSavedExamples(restoredExamples);
  }, []);

  const selectJob = (jobId: string, trackSelection = true) => {
    const nextJob = starterJobs.find((job) => job.id === jobId) || starterJobs[0];
    setSelectedJobId(nextJob.id);
    setResult(null);
    setError(null);
    if (trackSelection) {
      trackAgentConsoleEvent({
        event: 'job_selected',
        hasInput: Boolean(draft.trim()),
        inputLength: draft.trim().length,
        jobId: nextJob.id,
        savedExampleCount: savedExamples.filter((example) => example.jobId === nextJob.id).length,
        workerId: nextJob.workerId,
      });
    }
  };

  const runAgentJob = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = draft.trim();
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
      savedExampleCount: selectedExamples.length,
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

  const savePreferences = () => {
    const nextPreferences = normalizePreferences(preferences);
    setPreferences(nextPreferences);
    localStorage.setItem(preferencesStorageKey, JSON.stringify(nextPreferences));
    setPreferencesOpen(false);
    trackAgentConsoleEvent({
      event: 'voice_saved',
      hasInput: Boolean(nextPreferences.agentName || nextPreferences.market),
      jobId: selectedJob.id,
      workerId: selectedJob.workerId,
    });
  };

  const updatePreference = (field: keyof AgentPreferences, value: string) => {
    setPreferences((current) => ({ ...current, [field]: value }));
  };

  const loadSelectedJobExample = () => {
    setDraft(selectedJob.example);
    setResult(null);
    setError(null);
    trackAgentConsoleEvent({
      event: 'example_loaded',
      hasInput: true,
      inputLength: selectedJob.example.length,
      jobId: selectedJob.id,
      workerId: selectedJob.workerId,
    });
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

  const saveResultExample = () => {
    const output = result?.result.deliverable.copyReadyText.trim();
    if (!output || !currentInput.trim()) return;

    const nextExample: SavedExample = {
      id: crypto.randomUUID(),
      jobId: selectedJob.id,
      title: result?.result.deliverable.title || selectedJob.label,
      input: currentInput.trim(),
      output,
      createdAt: new Date().toISOString(),
    };
    const nextExamples = [nextExample, ...savedExamples].slice(0, 12);
    setSavedExamples(nextExamples);
    localStorage.setItem(savedExamplesStorageKey, JSON.stringify(nextExamples));
    setSavedResult(true);
    trackAgentConsoleEvent({
      commandId: result?.commandId,
      event: 'result_saved',
      hasInput: true,
      inputLength: currentInput.trim().length,
      jobId: selectedJob.id,
      resultLength: output.length,
      savedExampleCount: nextExamples.length,
      workerId: selectedJob.workerId,
    });
  };

  const deleteSavedExample = (id: string) => {
    const deletedExample = savedExamples.find((example) => example.id === id);
    const nextExamples = savedExamples.filter((example) => example.id !== id);
    setSavedExamples(nextExamples);
    localStorage.setItem(savedExamplesStorageKey, JSON.stringify(nextExamples));
    trackAgentConsoleEvent({
      event: 'saved_example_deleted',
      jobId: deletedExample?.jobId || selectedJob.id,
      savedExampleCount: nextExamples.length,
      workerId: selectedJob.workerId,
    });
  };

  const useSavedExample = (example: SavedExample) => {
    const matchingJob = starterJobs.find((job) => job.id === example.jobId);
    selectJob(example.jobId, false);
    setDraft(example.input);
    setResult(null);
    setError(null);
    trackAgentConsoleEvent({
      event: 'saved_example_used',
      hasInput: true,
      inputLength: example.input.length,
      jobId: example.jobId,
      resultLength: example.output.length,
      workerId: matchingJob?.workerId,
    });
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
            <WorkflowForm
              draft={draft}
              onDraftChange={setDraft}
              onExampleLoad={loadSelectedJobExample}
              onPreferenceChange={updatePreference}
              onPreferencesOpen={() => setPreferencesOpen(true)}
              onRun={runAgentJob}
              onSavePreferences={savePreferences}
              onSelectJob={selectJob}
              preferences={preferences}
              preferencesOpen={preferencesOpen}
              running={running}
              selectedExamplesCount={selectedExamples.length}
              selectedJob={selectedJob}
            />

            <SavedExamplesLibrary
              examples={exampleLibrary}
              onCopy={copySavedExample}
              onDelete={deleteSavedExample}
              onUse={useSavedExample}
              selectedJobId={selectedJob.id}
              totalCount={savedExamples.length}
            />

            <section className="rounded-md border border-[#c9d3ca] bg-[#fffdf7] p-4" aria-live="polite">
              {running ? (
                <RunningResultPreview
                  jobLabel={selectedJob.label}
                  outputLabel={selectedJob.outputLabel}
                  progress={progress}
                />
              ) : error ? (
                <div className="flex items-start gap-3 text-[#8a2e20]">
                  <AlertCircle className="mt-1 shrink-0" size={18} />
                  <p className="text-sm font-semibold leading-6">{error}</p>
                </div>
              ) : result ? (
                <ResultPanel
                  result={result}
                  copied={copied}
                  saved={savedResult}
                  onCopy={copyResult}
                  onSave={saveResultExample}
                />
              ) : (
                <div className="flex items-start gap-3 text-[#4c5a55]">
                  <CheckCircle2 className="mt-1 shrink-0 text-[#517268]" size={18} />
                  <div>
                    <p className="font-semibold text-[#17201f]">Ready</p>
                    <p className="mt-1 text-sm leading-6">Jamie will return one client-ready answer and the next action.</p>
                  </div>
                </div>
              )}
            </section>

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

function WorkflowForm({
  draft,
  onDraftChange,
  onExampleLoad,
  onPreferenceChange,
  onPreferencesOpen,
  onRun,
  onSavePreferences,
  onSelectJob,
  preferences,
  preferencesOpen,
  running,
  selectedExamplesCount,
  selectedJob,
}: {
  draft: string;
  onDraftChange: (value: string) => void;
  onExampleLoad: () => void;
  onPreferenceChange: (field: keyof AgentPreferences, value: string) => void;
  onPreferencesOpen: () => void;
  onRun: (event: FormEvent<HTMLFormElement>) => void;
  onSavePreferences: () => void;
  onSelectJob: (jobId: string) => void;
  preferences: AgentPreferences;
  preferencesOpen: boolean;
  running: boolean;
  selectedExamplesCount: number;
  selectedJob: StarterJob;
}) {
  return (
    <form onSubmit={onRun} className="rounded-md border border-[#c9d3ca] bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 border-b border-[#e3e8e3] pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#517268]">{selectedJob.outputLabel}</p>
          <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-bold text-[#111817]">{selectedJob.label}</h2>
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#517268] sm:w-56">
              Workflow
              <select
                value={selectedJob.id}
                onChange={(event) => onSelectJob(event.target.value)}
                className="h-10 rounded-md border border-[#b9c6bd] bg-[#fbfcf8] px-3 text-sm font-bold normal-case tracking-normal text-[#17201f] outline-none focus:border-[#185b4d] focus:ring-2 focus:ring-[#8ab6a8]"
              >
                {starterJobs.map((job) => (
                  <option key={job.id} value={job.id}>{job.label}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#4c5a55]">{selectedJob.description}</p>
          <div className="mt-3 border-t border-[#e3e8e3] pt-3">
            {preferencesOpen ? (
              <div className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm font-semibold text-[#24312f]">
                    Agent name
                    <input
                      value={preferences.agentName}
                      onChange={(event) => onPreferenceChange('agentName', event.target.value)}
                      className="h-10 rounded-md border border-[#b9c6bd] bg-white px-3 text-sm font-medium text-[#17201f] outline-none focus:border-[#185b4d] focus:ring-2 focus:ring-[#8ab6a8]"
                      placeholder="Your name"
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold text-[#24312f]">
                    Market
                    <input
                      value={preferences.market}
                      onChange={(event) => onPreferenceChange('market', event.target.value)}
                      className="h-10 rounded-md border border-[#b9c6bd] bg-white px-3 text-sm font-medium text-[#17201f] outline-none focus:border-[#185b4d] focus:ring-2 focus:ring-[#8ab6a8]"
                      placeholder="North Texas"
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold text-[#24312f]">
                    Tone
                    <select
                      value={preferences.tone}
                      onChange={(event) => onPreferenceChange('tone', event.target.value)}
                      className="h-10 rounded-md border border-[#b9c6bd] bg-white px-3 text-sm font-medium text-[#17201f] outline-none focus:border-[#185b4d] focus:ring-2 focus:ring-[#8ab6a8]"
                    >
                      {toneOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-semibold text-[#24312f]">
                    CTA
                    <select
                      value={preferences.cta}
                      onChange={(event) => onPreferenceChange('cta', event.target.value)}
                      className="h-10 rounded-md border border-[#b9c6bd] bg-white px-3 text-sm font-medium text-[#17201f] outline-none focus:border-[#185b4d] focus:ring-2 focus:ring-[#8ab6a8]"
                    >
                      {ctaOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <button
                  type="button"
                  onClick={onSavePreferences}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#185b4d] px-4 text-sm font-bold text-white hover:bg-[#13483d] focus:outline-none focus:ring-2 focus:ring-[#8ab6a8] sm:w-fit"
                >
                  <Save size={16} />
                  Save Voice
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-[#4c5a55]">
                  <span className="font-semibold text-[#24312f]">Voice</span>: {preferences.agentName.trim() || 'Agent'} - {preferences.market} - {preferences.tone}
                </p>
                <button
                  type="button"
                  onClick={onPreferencesOpen}
                  className="inline-flex h-8 items-center justify-center rounded-md border border-[#d8dfd9] bg-[#fbfcf8] px-2.5 text-xs font-semibold text-[#24312f] hover:border-[#789184] hover:bg-[#eef5f1] focus:outline-none focus:ring-2 focus:ring-[#789184] sm:w-fit"
                >
                  Edit Voice
                </button>
              </div>
            )}
          </div>
        </div>
        <span className="inline-flex h-8 shrink-0 items-center rounded-md border border-[#d8dfd9] bg-[#fbfcf8] px-2.5 text-xs font-semibold text-[#4c5a55]">
          {selectedExamplesCount ? `${selectedExamplesCount} saved` : 'Ready'}
        </span>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label htmlFor="agent-console-input" className="text-sm font-semibold text-[#24312f]">
          {selectedJob.inputLabel}
        </label>
        <button
          type="button"
          onClick={onExampleLoad}
          className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-[#d8dfd9] bg-[#fbfcf8] px-2.5 text-xs font-semibold text-[#24312f] hover:border-[#789184] hover:bg-[#eef5f1] focus:outline-none focus:ring-2 focus:ring-[#789184] sm:w-fit"
        >
          <Clipboard size={14} />
          Use example
        </button>
      </div>
      <textarea
        id="agent-console-input"
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
        placeholder={selectedJob.placeholder}
        className="mt-2 min-h-44 w-full resize-y rounded-md border border-[#b9c6bd] bg-[#fbfcf8] p-3 text-base leading-7 text-[#17201f] outline-none placeholder:text-[#6f7d76] focus:border-[#185b4d] focus:ring-2 focus:ring-[#8ab6a8]"
      />

      <div className="mt-3 flex justify-end">
        <button
          type="submit"
          disabled={!draft.trim() || running}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#b94f35] px-5 text-sm font-bold text-white shadow-sm hover:bg-[#963d28] focus:outline-none focus:ring-2 focus:ring-[#d9785e] disabled:cursor-not-allowed disabled:bg-[#b6bdb8] sm:w-auto"
        >
          <Send size={16} />
          {running ? 'Working' : 'Run Jamie'}
        </button>
      </div>
    </form>
  );
}

function SavedExamplesLibrary({
  examples,
  onCopy,
  onDelete,
  onUse,
  selectedJobId,
  totalCount,
}: {
  examples: SavedExample[];
  onCopy: (example: SavedExample) => void | Promise<void>;
  onDelete: (id: string) => void;
  onUse: (example: SavedExample) => void;
  selectedJobId: string;
  totalCount: number;
}) {
  if (!examples.length) return null;

  return (
    <details className="rounded-md border border-[#c9d3ca] bg-white p-4 shadow-sm">
      <summary className="cursor-pointer text-sm font-semibold text-[#24312f]">
        Saved examples
        <span className="ml-2 rounded-md border border-[#d8dfd9] bg-[#fbfcf8] px-2 py-1 text-xs text-[#4c5a55]">
          {totalCount}
        </span>
      </summary>
      <div className="mt-3 grid gap-2">
        {examples.map((example) => {
          const matchingJob = starterJobs.find((job) => job.id === example.jobId);
          const isCurrentJob = example.jobId === selectedJobId;
          return (
            <div key={example.id} className="rounded-md border border-[#d8dfd9] bg-[#fbfcf8] p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#517268]">
                    {isCurrentJob ? 'This workflow' : matchingJob?.label || 'Saved'}
                  </p>
                  <p className="truncate text-sm font-semibold text-[#17201f]">{example.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#4c5a55]">{example.input}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => onUse(example)}
                    className="inline-flex h-9 items-center rounded-md border border-[#b9c6bd] bg-white px-3 text-xs font-semibold text-[#24312f] hover:border-[#789184] hover:bg-[#eef5f1]"
                  >
                    Use
                  </button>
                  <button
                    type="button"
                    onClick={() => void onCopy(example)}
                    className="inline-flex h-9 items-center rounded-md border border-[#b9c6bd] bg-white px-3 text-xs font-semibold text-[#24312f] hover:border-[#789184] hover:bg-[#eef5f1]"
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    aria-label="Delete saved example"
                    onClick={() => onDelete(example.id)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#e2b8ad] bg-white text-[#8a2e20] hover:bg-[#fff4f1]"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </details>
  );
}

function ResultPanel({
  result,
  copied,
  saved,
  onCopy,
  onSave,
}: {
  result: CommandResponse;
  copied: boolean;
  saved: boolean;
  onCopy: () => void;
  onSave: () => void;
}) {
  const primaryAction = result.result.actions[0];
  const supportingActions = result.result.actions.slice(1, 3);

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#517268]">{result.worker.name}</p>
          <h2 className="mt-1 text-2xl font-bold text-[#111817]">{result.result.deliverable.title || result.result.title}</h2>
          <p className="mt-1 text-sm leading-6 text-[#4c5a55]">Ready for the next client touch.</p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#b94f35] px-4 text-sm font-bold text-white shadow-sm hover:bg-[#963d28] focus:outline-none focus:ring-2 focus:ring-[#d9785e]"
          >
            <Copy size={16} />
            {copied ? 'Copied' : 'Copy to send'}
          </button>
          <button
            type="button"
            onClick={onSave}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[#b9c6bd] bg-white px-3 text-xs font-semibold text-[#24312f] hover:border-[#789184] hover:bg-[#eef5f1] focus:outline-none focus:ring-2 focus:ring-[#789184]"
          >
            <Save size={16} />
            {saved ? 'Saved' : 'Save example'}
          </button>
        </div>
      </div>

      <div className="whitespace-pre-wrap rounded-md border border-[#d8dfd9] bg-white p-4 text-base leading-7 text-[#17201f]">
        {result.result.deliverable.copyReadyText}
      </div>

      {primaryAction ? (
        <div className="rounded-md border border-[#c9d3ca] bg-[#fbfcf8] p-3">
          <p className="text-sm font-semibold text-[#24312f]">Suggested next step</p>
          <p className="mt-2 flex gap-2 text-sm leading-6 text-[#33413d]">
            <CheckCircle2 className="mt-1 shrink-0 text-[#517268]" size={16} />
            <span>{primaryAction}</span>
          </p>
          {supportingActions.length ? (
            <details className="mt-3 border-t border-[#e3e8e3] pt-3">
              <summary className="cursor-pointer text-sm font-semibold text-[#4c5a55]">More options</summary>
              <ul className="mt-2 grid gap-2">
                {supportingActions.map((action) => (
                  <li key={action} className="flex gap-2 text-sm leading-6 text-[#4c5a55]">
                    <CheckCircle2 className="mt-1 shrink-0 text-[#789184]" size={16} />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}

      <details className="rounded-md border border-[#d8dfd9] bg-white p-3">
        <summary className="cursor-pointer text-sm font-semibold text-[#24312f]">Why this answer</summary>
        <div className="mt-3 grid gap-3 text-sm leading-6 text-[#4c5a55]">
          <p>{result.result.summary}</p>
          {result.trace?.selectedShards?.slice(0, 3).map((shard) => (
            <div key={`${shard.source}-${shard.title}`} className="border-t border-[#e3e8e3] pt-3">
              <p className="font-semibold text-[#24312f]">{shard.title}</p>
              <p>{shard.excerpt}</p>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

function RunningResultPreview({
  jobLabel,
  outputLabel,
  progress,
}: {
  jobLabel: string;
  outputLabel: string;
  progress: CommandProgressEvent[];
}) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#517268]">Jamie is drafting</p>
          <h2 className="mt-1 text-2xl font-bold text-[#111817]">{outputLabel}</h2>
          <p className="mt-1 text-sm leading-6 text-[#4c5a55]">
            Keeping this focused on {jobLabel.toLowerCase()} and your saved voice baseline.
          </p>
        </div>
        <span className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-[#d8dfd9] bg-white px-2.5 text-xs font-semibold text-[#4c5a55]">
          Drafting
        </span>
      </div>

      <div className="rounded-md border border-[#d8dfd9] bg-white p-4">
        <div className="grid animate-pulse gap-3">
          <span className="h-3 w-11/12 rounded bg-[#dce4de]" />
          <span className="h-3 w-10/12 rounded bg-[#dce4de]" />
          <span className="h-3 w-8/12 rounded bg-[#dce4de]" />
          <span className="mt-2 h-3 w-9/12 rounded bg-[#e8ede8]" />
          <span className="h-3 w-7/12 rounded bg-[#e8ede8]" />
        </div>
      </div>

      <div className="rounded-md border border-[#d8dfd9] bg-white p-3">
        <p className="text-sm font-semibold text-[#24312f]">Progress</p>
        <ProgressList progress={progress} />
      </div>
    </div>
  );
}

function ProgressList({ progress }: { progress: CommandProgressEvent[] }) {
  return (
    <ul className="mt-2 grid gap-1 text-sm leading-6 text-[#4c5a55]">
      {progress.slice(-4).map((item) => (
        <li key={item.id} className="flex gap-2">
          <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${progressDotClass(item.status)}`} />
          <span>
            <span className="font-semibold text-[#24312f]">{formatProgressLabel(item)}</span>
            {item.detail ? `: ${formatProgressDetail(item.detail)}` : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function readCommandStream(
  response: Response,
  onProgress: (event: CommandProgressEvent) => void,
): Promise<CommandResponse> {
  if (!response.body) {
    return response.json() as Promise<CommandResponse>;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: CommandResponse | null = null;

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';

    for (const part of parts) {
      const event = parseServerSentEvent(part);
      if (!event) continue;
      if (event.event === 'progress') {
        onProgress(event.data as CommandProgressEvent);
      } else if (event.event === 'result') {
        result = event.data as CommandResponse;
      } else if (event.event === 'error') {
        const errorData = event.data as { error?: string };
        throw new Error(errorData.error || 'Jamie could not finish that job.');
      }
    }

    if (done) break;
  }

  if (!result) throw new Error('Jamie finished without returning an answer.');
  return result;
}

function parseServerSentEvent(chunk: string) {
  const lines = chunk.split(/\r?\n/g);
  const event = lines.find((line) => line.startsWith('event:'))?.slice('event:'.length).trim();
  const data = lines
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice('data:'.length).trim())
    .join('\n');

  if (!event || !data) return null;

  try {
    return { event, data: JSON.parse(data) as unknown };
  } catch {
    return null;
  }
}

function upsertProgressEvent(current: CommandProgressEvent[], next: CommandProgressEvent) {
  const index = current.findIndex((item) => item.id === next.id);
  if (index === -1) return [...current, next];

  const clone = current.slice();
  clone[index] = next;
  return clone;
}

function formatProgressLabel(item: CommandProgressEvent) {
  const normalized = item.label.trim().toLowerCase();
  if (normalized === 'submitted') return 'Request received';
  if (normalized.includes('advisor') || normalized.includes('route')) return 'Choosing the right worker';
  if (normalized.includes('supervisor')) return 'Checking the answer';
  if (normalized.includes('complete')) return 'Answer ready';
  if (normalized.includes('error')) return 'Needs attention';
  return item.label;
}

function formatProgressDetail(detail: string) {
  return detail.length > 90 ? `${detail.slice(0, 87)}...` : detail;
}

function progressDotClass(status: CommandProgressEvent['status']) {
  if (status === 'complete') return 'bg-[#517268]';
  if (status === 'error') return 'bg-[#b94f35]';
  if (status === 'running') return 'bg-[#d8a647]';
  return 'bg-[#c9d3ca]';
}
