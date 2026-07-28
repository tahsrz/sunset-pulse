'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clipboard,
  Copy,
  FileText,
  MessageSquareText,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
} from 'lucide-react';

type RelayMode = 'briefing' | 'slideshow' | 'puppetshow' | 'field-board' | 'script';

type StarterJob = {
  id: string;
  label: string;
  icon: typeof MessageSquareText;
  workerId: string;
  relayMode: RelayMode;
  prompt: string;
  placeholder: string;
  example: string;
};

type CommandProgressEvent = {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'complete' | 'error' | string;
  detail?: string;
};

type CommandResponse = {
  commandId: string;
  worker: {
    id: string;
    name: string;
    role: string;
  };
  result: {
    title: string;
    summary: string;
    actions: string[];
    confidence: number;
    deliverable: {
      title: string;
      copyReadyText: string;
      sourceSummary: string;
    };
  };
  trace?: {
    selectedShards?: Array<{
      title: string;
      source: string;
      excerpt: string;
    }>;
    progress?: CommandProgressEvent[];
  };
};

type AgentPreferences = {
  agentName: string;
  market: string;
  tone: string;
  cta: string;
};

type SavedExample = {
  id: string;
  jobId: string;
  title: string;
  input: string;
  output: string;
  createdAt: string;
};

const starterJobs: StarterJob[] = [
  {
    id: 'lead-follow-up',
    label: 'Follow Up',
    icon: MessageSquareText,
    workerId: 'follow-up-writer',
    relayMode: 'script',
    prompt: 'Write a concise, client-ready real estate follow-up. Use the agent voice layer, reference only supplied facts, and end with one natural next step.',
    placeholder: 'Paste the lead note, last message, or situation...',
    example: 'Buyer toured Oak Cliff bungalow last weekend. Liked the kitchen and yard, worried about commute. Follow up today.',
  },
  {
    id: 'listing-copy',
    label: 'Listing Copy',
    icon: FileText,
    workerId: 'listing-spark',
    relayMode: 'briefing',
    prompt: 'Turn these property facts into listing copy. Lead with the strongest verified hook, keep claims grounded, and include one polished version plus a softer alternate angle.',
    placeholder: 'Paste listing facts, MLS notes, photos notes, or seller context...',
    example: '3 bed, 2 bath, updated kitchen, mature trees, near downtown Denton. Seller wants warm but not overhyped copy.',
  },
  {
    id: 'objection-reply',
    label: 'Objection Reply',
    icon: ShieldCheck,
    workerId: 'objection-scripts',
    relayMode: 'script',
    prompt: 'Write a calm reply to this buyer or seller objection. Stay advisory, avoid pressure, and give one practical next-step question.',
    placeholder: 'Paste the objection or concern...',
    example: 'Buyer says rates are too high and wants to wait six months before looking again.',
  },
  {
    id: 'property-summary',
    label: 'Property Summary',
    icon: Clipboard,
    workerId: 'listing-summary',
    relayMode: 'briefing',
    prompt: 'Summarize this property for a real estate client. Separate verified facts from missing details, and make the next action obvious.',
    placeholder: 'Paste property details, a listing description, or notes...',
    example: 'MLS notes: renovated ranch, 0.4 acre lot, new roof 2024, no seller disclosure attached yet.',
  },
  {
    id: 'agent-voice',
    label: 'Sound Like Me',
    icon: UserRound,
    workerId: 'agent-voice',
    relayMode: 'script',
    prompt: 'Rewrite this in the agent brand voice. Make it concise, useful, local, confident, warm, and remove generic AI phrasing.',
    placeholder: 'Paste the draft that should sound more like you...',
    example: 'I wanted to reach out and see if you had any questions about the property we discussed previously.',
  },
];

const idleProgress: CommandProgressEvent[] = [
  { id: 'ready', label: 'Ready', status: 'complete', detail: 'Choose a job and run it.' },
];

const preferencesStorageKey = 'sunset_agent_console_preferences';
const savedExamplesStorageKey = 'sunset_agent_console_examples';

const defaultPreferences: AgentPreferences = {
  agentName: '',
  market: 'North Texas',
  tone: 'Warm, direct, local',
  cta: 'Ask for a quick reply',
};

const toneOptions = [
  'Warm, direct, local',
  'Polished and concise',
  'Friendly and casual',
  'Calm and advisory',
];

const ctaOptions = [
  'Ask for a quick reply',
  'Offer to send more detail',
  'Ask to schedule a showing',
  'Offer a short call',
];

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

  useEffect(() => {
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

    setRunning(true);
    setError(null);
    setResult(null);
    setCopied(false);
    setSavedResult(false);
    setCurrentInput(trimmed);
    setProgress([{ id: 'submitted', label: 'Submitted', status: 'complete', detail: selectedJob.label }]);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Jamie could not finish that job.');
    } finally {
      setRunning(false);
    }
  };

  const savePreferences = () => {
    const nextPreferences = normalizePreferences(preferences);
    setPreferences(nextPreferences);
    localStorage.setItem(preferencesStorageKey, JSON.stringify(nextPreferences));
    setPreferencesOpen(false);
  };

  const copyResult = async () => {
    const text = result?.result.deliverable.copyReadyText;
    if (!text) return;

    await navigator.clipboard.writeText(text);
    setCopied(true);
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
  };

  const deleteSavedExample = (id: string) => {
    const nextExamples = savedExamples.filter((example) => example.id !== id);
    setSavedExamples(nextExamples);
    localStorage.setItem(savedExamplesStorageKey, JSON.stringify(nextExamples));
  };

  const copySavedExample = async (example: SavedExample) => {
    await navigator.clipboard.writeText(example.output);
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
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#b9c6bd] bg-white px-3 text-sm font-semibold text-[#24312f] hover:border-[#789184] hover:bg-[#eef5f1] focus:outline-none focus:ring-2 focus:ring-[#789184]"
          >
            <Sparkles size={16} />
            Advanced
          </Link>
        </div>
      </section>

      <section className="px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
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
                  }}
                  className={`flex min-h-14 items-center gap-3 rounded-md border px-3 text-left text-sm font-semibold transition ${
                    active
                      ? 'border-[#185b4d] bg-[#185b4d] text-white shadow-sm'
                      : 'border-[#c9d3ca] bg-white text-[#24312f] hover:border-[#789184] hover:bg-[#eef5f1]'
                  }`}
                >
                  <Icon size={18} />
                  {job.label}
                </button>
              );
            })}
          </nav>

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
                      {preferences.agentName.trim() || 'Agent'} · {preferences.market}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[#4c5a55]">
                      {preferences.tone} · {preferences.cta}
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
              <label htmlFor="agent-console-input" className="text-sm font-semibold text-[#24312f]">
                {selectedJob.label}
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

function normalizePreferences(preferences: AgentPreferences): AgentPreferences {
  return {
    agentName: preferences.agentName.trim(),
    market: preferences.market.trim() || defaultPreferences.market,
    tone: preferences.tone.trim() || defaultPreferences.tone,
    cta: preferences.cta.trim() || defaultPreferences.cta,
  };
}

function formatAgentPreferences(preferences: AgentPreferences) {
  const normalized = normalizePreferences(preferences);
  return [
    `Agent name: ${normalized.agentName || 'Not provided'}`,
    `Market: ${normalized.market}`,
    `Tone: ${normalized.tone}`,
    `Preferred CTA: ${normalized.cta}`,
  ].join('\n');
}

function restoreAgentPreferences(value: string | null): AgentPreferences | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<AgentPreferences>;
    if (!parsed || typeof parsed !== 'object') return null;

    return normalizePreferences({
      agentName: typeof parsed.agentName === 'string' ? parsed.agentName : '',
      market: typeof parsed.market === 'string' ? parsed.market : defaultPreferences.market,
      tone: typeof parsed.tone === 'string' ? parsed.tone : defaultPreferences.tone,
      cta: typeof parsed.cta === 'string' ? parsed.cta : defaultPreferences.cta,
    });
  } catch {
    return null;
  }
}

function restoreSavedExamples(value: string | null): SavedExample[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as Partial<SavedExample>[];
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((example) => {
      if (
        typeof example?.id !== 'string'
        || typeof example.jobId !== 'string'
        || typeof example.title !== 'string'
        || typeof example.input !== 'string'
        || typeof example.output !== 'string'
        || typeof example.createdAt !== 'string'
      ) {
        return [];
      }

      return [{
        id: example.id,
        jobId: example.jobId,
        title: example.title,
        input: example.input,
        output: example.output,
        createdAt: example.createdAt,
      }];
    }).slice(0, 12);
  } catch {
    return [];
  }
}
