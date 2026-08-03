'use client';

import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Save,
} from 'lucide-react';
import {
  type CommandProgressEvent,
  type CommandResponse,
  type StarterJob,
} from './agentConsoleConfig';
import {
  formatProgressDetail,
  formatProgressLabel,
  progressDotClass,
} from './agentConsoleProgress';

export function AgentConsoleOutputPanel({
  copied,
  error,
  onCopy,
  onSave,
  progress,
  result,
  running,
  saved,
  selectedJob,
}: {
  copied: boolean;
  error: string | null;
  onCopy: () => void;
  onSave: () => void;
  progress: CommandProgressEvent[];
  result: CommandResponse | null;
  running: boolean;
  saved: boolean;
  selectedJob: StarterJob;
}) {
  if (!running && !error && !result) return null;

  return (
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
          saved={saved}
          onCopy={onCopy}
          onSave={onSave}
        />
      ) : null}
    </section>
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
            className="inline-flex h-8 items-center justify-center gap-1.5 px-2 text-xs font-semibold text-[#517268] hover:text-[#24312f] focus:outline-none focus:ring-2 focus:ring-[#789184]"
          >
            <Save size={14} />
            {saved ? 'Saved for later' : 'Save for later'}
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
