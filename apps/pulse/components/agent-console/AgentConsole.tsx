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
  const [preferencesOpen, setPreferencesOpen] = useState(true);
  const [savedExamples, setSavedExamples] = useState<SavedExample[]>([]);

  const selectedJob = useMemo(
    () => starterJobs.find((job) => job.id === selectedJobId) || starterJobs[0],
    [selectedJobId],
  );

  const selectedExamples = useMemo(
    () => savedExamples.filter((example) => example.jobId === selectedJob.id).slice(0, 3),
    [savedExamples, selectedJob.id],
  );

  const recentExamples = useMemo(
    () => savedExamples.slice(0, 3),
    [savedExamples],
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
      setPreferencesOpen(false);
    } else {
      setPreferencesOpen(true);
    }

    const restoredExamples = restoreSavedExamples(localStorage.getItem(savedExamplesStorageKey));
    setSavedExamples(restoredExamples);
  }, []);

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
    setProgress([{ id: 'submitted', label: 'Submitted', status: 'complete', detail: selectedJob.label }]);
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

  const copySavedExample = async (example: SavedExample) => {
    await navigator.clipboard.writeText(example.output);
    trackAgentConsoleEvent({
      event: 'saved_example_copied',
      jobId: example.jobId,
      resultLength: example.output.length,
      workerId: selectedJob.workerId,
    });
  };

  return (
    <main className="min-h-screen bg-[#f6f7f2] text-[#17201f]">
      <section className="border-b border-[#c9d3ca] bg-[#fffdf7] px-4 pt-24 pb-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#517268]">Sunset Pulse</p>
            <h1 className="mt-1 text-3xl font-bold text-[#111817] sm:text-4xl">Agent Console</h1>
          </div>
          <Link
            href="/command-center"
            onClick={() => trackAgentConsoleEvent({
              event: 'advanced_opened',
              jobId: selectedJob.id,
              workerId: selectedJob.workerId,
            })}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#b9c6bd] bg-white px-3 text-sm font-semibold text-[#24312f] hover:border-[#789184] hover:bg-[#eef5f1] focus:outline-none focus:ring-2 focus:ring-[#789184]"
          >
            <Sparkles size={16} />
            Advanced
          </Link>
        </div>
      </section>

      <section className="px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="grid content-start gap-4">
            <nav className="grid content-start gap-2" aria-label="Agent jobs">
              {starterJobs.map((job) => {
                const Icon = job.icon;
                const active = selectedJob.id === job.id;
                return (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => {
                      setSelectedJobId(job.id);
                      setResult(null);
                      setError(null);
                      trackAgentConsoleEvent({
                        event: 'job_selected',
                        hasInput: Boolean(draft.trim()),
                        inputLength: draft.trim().length,
                        jobId: job.id,
                        savedExampleCount: savedExamples.filter((example) => example.jobId === job.id).length,
                        workerId: job.workerId,
                      });
                    }}
                    className={`grid min-h-20 grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-md border px-3 py-3 text-left transition ${
                      active
                        ? 'border-[#185b4d] bg-[#185b4d] text-white shadow-sm'
                        : 'border-[#c9d3ca] bg-white text-[#24312f] hover:border-[#789184] hover:bg-[#eef5f1]'
                    }`}
                  >
                    <span className={`mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-md ${
                      active ? 'bg-white/15 text-white' : 'bg-[#eef5f1] text-[#185b4d]'
                    }`}>
                      <Icon size={18} />
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold">{job.label}</span>
                        {job.priorityLabel ? (
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                            active ? 'bg-white/15 text-white' : 'bg-[#e9f3ee] text-[#185b4d]'
                          }`}>
                            {job.priorityLabel}
                          </span>
                        ) : null}
                      </span>
                      <span className={`mt-1 block text-xs leading-5 ${active ? 'text-white/80' : 'text-[#5a6963]'}`}>
                        {job.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </nav>

            {recentExamples.length ? (
              <section className="rounded-md border border-[#c9d3ca] bg-white p-3 shadow-sm">
                <p className="text-sm font-semibold text-[#24312f]">Recent outputs</p>
                <div className="mt-3 grid gap-2">
                  {recentExamples.map((example) => (
                    <button
                      key={example.id}
                      type="button"
                      onClick={() => {
                        const matchingJob = starterJobs.find((job) => job.id === example.jobId);
                        setSelectedJobId(matchingJob?.id || starterJobs[0].id);
                        setDraft(example.input);
                        setResult(null);
                        setError(null);
                        trackAgentConsoleEvent({
                          event: 'recent_output_used',
                          hasInput: true,
                          inputLength: example.input.length,
                          jobId: example.jobId,
                          resultLength: example.output.length,
                          workerId: matchingJob?.workerId,
                        });
                      }}
                      className="min-w-0 rounded-md border border-[#d8dfd9] bg-[#fbfcf8] p-3 text-left hover:border-[#789184] hover:bg-[#eef5f1]"
                    >
                      <span className="block truncate text-sm font-semibold text-[#17201f]">{example.title}</span>
                      <span className="mt-1 line-clamp-2 text-xs leading-5 text-[#5a6963]">{example.input}</span>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
          </aside>

          <div className="grid gap-5">
            <section className="rounded-md border border-[#c9d3ca] bg-[#fffdf7] p-4 shadow-sm">
              {preferencesOpen ? (
                <div className="grid gap-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1 text-sm font-semibold text-[#24312f]">
                      Agent name
                      <input
                        value={preferences.agentName}
                        onChange={(event) => setPreferences((current) => ({ ...current, agentName: event.target.value }))}
                        className="h-10 rounded-md border border-[#b9c6bd] bg-white px-3 text-sm font-medium text-[#17201f] outline-none focus:border-[#185b4d] focus:ring-2 focus:ring-[#8ab6a8]"
                        placeholder="Your name"
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-semibold text-[#24312f]">
                      Market
                      <input
                        value={preferences.market}
                        onChange={(event) => setPreferences((current) => ({ ...current, market: event.target.value }))}
                        className="h-10 rounded-md border border-[#b9c6bd] bg-white px-3 text-sm font-medium text-[#17201f] outline-none focus:border-[#185b4d] focus:ring-2 focus:ring-[#8ab6a8]"
                        placeholder="North Texas"
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-semibold text-[#24312f]">
                      Tone
                      <select
                        value={preferences.tone}
                        onChange={(event) => setPreferences((current) => ({ ...current, tone: event.target.value }))}
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
                        onChange={(event) => setPreferences((current) => ({ ...current, cta: event.target.value }))}
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
                    onClick={savePreferences}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#185b4d] px-4 text-sm font-bold text-white hover:bg-[#13483d] focus:outline-none focus:ring-2 focus:ring-[#8ab6a8] sm:w-fit"
                  >
                    <Save size={16} />
                    Save Voice
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#17201f]">
                      {preferences.agentName.trim() || 'Agent'} - {preferences.market}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[#4c5a55]">
                      {preferences.tone} - {preferences.cta}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreferencesOpen(true)}
                    className="inline-flex h-10 items-center justify-center rounded-md border border-[#b9c6bd] bg-white px-3 text-sm font-semibold text-[#24312f] hover:border-[#789184] hover:bg-[#eef5f1] focus:outline-none focus:ring-2 focus:ring-[#789184]"
                  >
                    Edit Voice
                  </button>
                </div>
              )}
            </section>

            <form onSubmit={runAgentJob} className="rounded-md border border-[#c9d3ca] bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 border-b border-[#e3e8e3] pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#517268]">{selectedJob.outputLabel}</p>
                  <h2 className="mt-1 text-2xl font-bold text-[#111817]">{selectedJob.label}</h2>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-[#4c5a55]">{selectedJob.description}</p>
                </div>
                <span className="inline-flex h-8 shrink-0 items-center rounded-md border border-[#d8dfd9] bg-[#fbfcf8] px-2.5 text-xs font-semibold text-[#4c5a55]">
                  {selectedExamples.length ? `${selectedExamples.length} saved` : 'Ready'}
                </span>
              </div>
              <label htmlFor="agent-console-input" className="text-sm font-semibold text-[#24312f]">
                {selectedJob.inputLabel}
              </label>
              <textarea
                id="agent-console-input"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={selectedJob.placeholder}
                className="mt-2 min-h-44 w-full resize-y rounded-md border border-[#b9c6bd] bg-[#fbfcf8] p-3 text-base leading-7 text-[#17201f] outline-none placeholder:text-[#6f7d76] focus:border-[#185b4d] focus:ring-2 focus:ring-[#8ab6a8]"
              />

              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => {
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
                  }}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#c9d3ca] bg-[#fffdf7] px-3 text-sm font-semibold text-[#24312f] hover:border-[#d8a647] focus:outline-none focus:ring-2 focus:ring-[#d8a647]"
                >
                  <Clipboard size={16} />
                  Example
                </button>
                <button
                  type="submit"
                  disabled={!draft.trim() || running}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#b94f35] px-5 text-sm font-bold text-white shadow-sm hover:bg-[#963d28] focus:outline-none focus:ring-2 focus:ring-[#d9785e] disabled:cursor-not-allowed disabled:bg-[#b6bdb8]"
                >
                  <Send size={16} />
                  {running ? 'Working' : 'Run Jamie'}
                </button>
              </div>
            </form>

            {selectedExamples.length ? (
              <section className="rounded-md border border-[#c9d3ca] bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-[#24312f]">Saved examples</p>
                <div className="mt-3 grid gap-2">
                  {selectedExamples.map((example) => (
                    <div key={example.id} className="rounded-md border border-[#d8dfd9] bg-[#fbfcf8] p-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#17201f]">{example.title}</p>
                          <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#4c5a55]">{example.input}</p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setDraft(example.input);
                              setResult(null);
                              setError(null);
                              trackAgentConsoleEvent({
                                event: 'saved_example_used',
                                hasInput: true,
                                inputLength: example.input.length,
                                jobId: example.jobId,
                                resultLength: example.output.length,
                                workerId: selectedJob.workerId,
                              });
                            }}
                            className="inline-flex h-9 items-center rounded-md border border-[#b9c6bd] bg-white px-3 text-xs font-semibold text-[#24312f] hover:border-[#789184] hover:bg-[#eef5f1]"
                          >
                            Use
                          </button>
                          <button
                            type="button"
                            onClick={() => void copySavedExample(example)}
                            className="inline-flex h-9 items-center rounded-md border border-[#b9c6bd] bg-white px-3 text-xs font-semibold text-[#24312f] hover:border-[#789184] hover:bg-[#eef5f1]"
                          >
                            Copy
                          </button>
                          <button
                            type="button"
                            aria-label="Delete saved example"
                            onClick={() => deleteSavedExample(example.id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#e2b8ad] bg-white text-[#8a2e20] hover:bg-[#fff4f1]"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="rounded-md border border-[#c9d3ca] bg-[#fffdf7] p-4" aria-live="polite">
              {running ? (
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-3 w-3 rounded-full bg-[#d8a647]" />
                  <div>
                    <p className="font-semibold text-[#17201f]">Working</p>
                    <ProgressList progress={progress} />
                  </div>
                </div>
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
          </div>
        </div>
      </section>
    </main>
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
  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#517268]">{result.worker.name}</p>
          <h2 className="mt-1 text-2xl font-bold text-[#111817]">{result.result.deliverable.title || result.result.title}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#b9c6bd] bg-white px-3 text-sm font-semibold text-[#24312f] hover:border-[#789184] hover:bg-[#eef5f1] focus:outline-none focus:ring-2 focus:ring-[#789184]"
          >
            <Copy size={16} />
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={onSave}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#b9c6bd] bg-white px-3 text-sm font-semibold text-[#24312f] hover:border-[#789184] hover:bg-[#eef5f1] focus:outline-none focus:ring-2 focus:ring-[#789184]"
          >
            <Save size={16} />
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      <div className="whitespace-pre-wrap rounded-md border border-[#d8dfd9] bg-white p-4 text-base leading-7 text-[#17201f]">
        {result.result.deliverable.copyReadyText}
      </div>

      {result.result.actions.length ? (
        <div>
          <p className="text-sm font-semibold text-[#24312f]">Next</p>
          <ul className="mt-2 grid gap-2">
            {result.result.actions.slice(0, 3).map((action) => (
              <li key={action} className="flex gap-2 text-sm leading-6 text-[#33413d]">
                <CheckCircle2 className="mt-1 shrink-0 text-[#517268]" size={16} />
                <span>{action}</span>
              </li>
            ))}
          </ul>
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

function ProgressList({ progress }: { progress: CommandProgressEvent[] }) {
  return (
    <ul className="mt-2 grid gap-1 text-sm leading-6 text-[#4c5a55]">
      {progress.slice(-4).map((item) => (
        <li key={item.id}>
          <span className="font-semibold text-[#24312f]">{item.label}</span>
          {item.detail ? `: ${item.detail}` : null}
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
