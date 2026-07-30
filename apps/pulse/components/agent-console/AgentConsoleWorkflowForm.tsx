'use client';

import React, { type FormEvent } from 'react';
import { Clipboard, Save, Send, Sparkles } from 'lucide-react';
import {
  starterJobs,
  type AgentPreferences,
  type StarterJob,
  voiceStyleOptions,
} from './agentConsoleConfig';

export function AgentConsoleWorkflowForm({
  draft,
  onDraftChange,
  onExampleLoad,
  onPreferenceChange,
  onPreferencesOpen,
  onQuickStart,
  onRun,
  onSavePreferences,
  onSelectJob,
  preferences,
  preferencesOpen,
  running,
  selectedExamplesCount,
  selectedJob,
  showQuickStart,
}: {
  draft: string;
  onDraftChange: (value: string) => void;
  onExampleLoad: () => void;
  onPreferenceChange: (field: keyof AgentPreferences, value: string) => void;
  onPreferencesOpen: () => void;
  onQuickStart: () => void;
  onRun: (event: FormEvent<HTMLFormElement>) => void;
  onSavePreferences: () => void;
  onSelectJob: (jobId: string) => void;
  preferences: AgentPreferences;
  preferencesOpen: boolean;
  running: boolean;
  selectedExamplesCount: number;
  selectedJob: StarterJob;
  showQuickStart: boolean;
}) {
  const voiceButtonLabel = `Voice: ${preferences.tone}`;

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
                <div>
                  <p className="text-sm font-semibold text-[#24312f]">Sound like me</p>
                  <p className="mt-1 text-sm leading-6 text-[#4c5a55]">
                    Set the basics once. Jamie applies this voice to every workflow.
                  </p>
                </div>
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
                </div>
                <fieldset className="grid gap-2">
                  <legend className="text-sm font-semibold text-[#24312f]">Voice style</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {voiceStyleOptions.map((option) => {
                      const selected = preferences.tone === option.tone && preferences.cta === option.cta;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => {
                            onPreferenceChange('tone', option.tone);
                            onPreferenceChange('cta', option.cta);
                          }}
                          className={`rounded-md border p-3 text-left focus:outline-none focus:ring-2 focus:ring-[#8ab6a8] ${
                            selected
                              ? 'border-[#185b4d] bg-[#eef5f1] text-[#17201f]'
                              : 'border-[#d8dfd9] bg-white text-[#24312f] hover:border-[#789184] hover:bg-[#fbfcf8]'
                          }`}
                        >
                          <span className="block text-sm font-bold">{option.label}</span>
                          <span className="mt-1 block text-sm leading-6 text-[#4c5a55]">{option.description}</span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
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
              <button
                type="button"
                onClick={onPreferencesOpen}
                className="inline-flex h-8 max-w-full items-center justify-center rounded-md border border-[#d8dfd9] bg-[#fbfcf8] px-2.5 text-xs font-semibold text-[#24312f] hover:border-[#789184] hover:bg-[#eef5f1] focus:outline-none focus:ring-2 focus:ring-[#789184]"
              >
                <span className="truncate">{voiceButtonLabel}</span>
              </button>
            )}
          </div>
        </div>
        {selectedExamplesCount ? (
          <span className="inline-flex h-8 shrink-0 self-start items-center rounded-md border border-[#d8dfd9] bg-[#fbfcf8] px-2.5 text-xs font-semibold text-[#4c5a55]">
            {selectedExamplesCount} saved
          </span>
        ) : null}
      </div>
      {showQuickStart ? (
        <div className="mb-4 rounded-md border border-[#d8dfd9] bg-[#fbfcf8] p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#24312f]">Start faster</p>
              <p className="mt-1 text-sm leading-6 text-[#4c5a55]">
                Load a proven example, run Jamie, then copy the finished message.
              </p>
            </div>
            <button
              type="button"
              onClick={onQuickStart}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-[#185b4d] px-4 text-sm font-bold text-white hover:bg-[#13483d] focus:outline-none focus:ring-2 focus:ring-[#8ab6a8] sm:w-fit"
            >
              <Sparkles size={16} />
              Start with example
            </button>
          </div>
        </div>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label htmlFor="agent-console-input" className="text-sm font-semibold text-[#24312f]">
          {selectedJob.inputLabel}
        </label>
        {showQuickStart ? null : (
          <button
            type="button"
            onClick={onExampleLoad}
            className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-[#d8dfd9] bg-[#fbfcf8] px-2.5 text-xs font-semibold text-[#24312f] hover:border-[#789184] hover:bg-[#eef5f1] focus:outline-none focus:ring-2 focus:ring-[#789184] sm:w-fit"
          >
            <Clipboard size={14} />
            Use example
          </button>
        )}
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
