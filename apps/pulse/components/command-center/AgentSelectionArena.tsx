'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  BookOpen,
  Check,
  ChevronRight,
  ClipboardList,
  Copy,
  ExternalLink,
  Gauge,
  Layers3,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  TerminalSquare
} from 'lucide-react';
import { useTheme } from '@/context/ThemeProvider';
import { renderGlossaryText as glossaryText } from '@/components/glossary/GlossaryText';
import { CommandActionPanel } from './CommandActionPanel';
import { ParsedRecordCard } from './ParsedRecordCard';
import type { CivicServiceRecord, CommandActionItem } from '@/lib/command-center/actionTypes';
import {
  chooseWorkerForCommand,
  intelligenceWorkers,
  quickCommands,
  type IntelligenceWorker,
  type WorkerStatKey
} from '@/lib/command-center/workerRoster';

type RelayMode = 'briefing' | 'slideshow' | 'puppetshow' | 'field-board' | 'script';

type CommandResponse = {
  commandId: string;
  intent: string;
  worker: {
    id: string;
    name: string;
    role: string;
    slot: IntelligenceWorker['slot'];
  };
  model: string;
  tahFiles: string[];
  result: {
    title: string;
    summary: string;
    actions: string[];
    confidence: number;
    civicRecord?: CivicServiceRecord;
    actionItems?: CommandActionItem[];
    relayPlan: {
      templateId: string;
      templateName: string;
      mode: RelayMode;
      purpose: string;
      visual: {
        motif: string;
        layout: string;
        cues: string[];
      };
      format: {
        mode: RelayMode;
        name: string;
        useWhen: string;
        frameLabel: string;
        rhythm: string;
        visualDirection: string;
        outputContract: string[];
      };
      availableFormats: Array<{
        mode: RelayMode;
        name: string;
        useWhen: string;
      }>;
      words: {
        voice: string;
        explanationMoves: string[];
        avoid: string[];
      };
      sections: Array<{
        label: string;
        instruction: string;
      }>;
      finalScreen: {
        title: string;
        frameLabel: string;
        instruction: string;
        sourceCards: Array<{
          source: string;
          concepts: string[];
          matchReason: string;
        }>;
        learned: string[];
      };
      sourceAnchors: string[];
    };
    deliverable: {
      mode: RelayMode;
      title: string;
      copyReadyText: string;
      sourceSummary: string;
      frames: Array<{
        label: string;
        title: string;
        visualDirection: string;
        body: string;
        speakerNote: string;
        sourceAnchor: string;
      }>;
    };
  };
  trace: {
    routeMode: 'auto' | 'manual';
    selectedShards: Array<{
      expertId: number;
      title: string;
      source: string;
      score: number;
      concepts: string[];
      excerpt: string;
      metrics?: {
        complexity: number;
        density: number;
        vitality: number;
        contextLevel: 'summary' | 'interface' | 'full';
        matchReason: string;
      };
    }>;
    atlasDiagnostics?: {
      totalSegments: number;
      visitedSegments: number;
      rejectedSegments: number;
      candidateExperts: number;
      linkedExperts?: number;
      payloadReads: number;
      routeIndex: number;
    };
    retrievalPolicy?: {
      name: string;
      contextMode: 'compact';
      targetComplexity: number;
      linkedExpansionDepth: number;
      synonymTerms: number;
      stages: Array<{
        name: string;
        input: number;
        kept: number;
        rejected: number;
      }>;
    };
    supervisorNotes?: string[];
    queryMemory?: {
      status: 'saved' | 'disabled' | 'unavailable';
      path: string;
      recalled: number;
      saved: boolean;
      reason?: string;
    };
    commandPost?: {
      status: 'linked' | 'access_denied' | 'unavailable';
      endpoint: string;
      consoleHref: string;
      accessMode?: string;
      reason?: string;
      masterArchive?: {
        status: string;
        sourceCount: number;
        shardCount: number;
      };
      pendingTerminalIntentCount?: number;
      commandRouterModes?: string[];
      statusProbe?: {
        ok: boolean;
        action: string;
        reply: string;
      };
    };
  };
};

type TahFactResponse = {
  date: string;
  shardIndex: number;
  source: string | null;
  slug: string | null;
  title: string;
  searchQuery: string | null;
  blurb: string;
  archive: {
    name: string;
    sourceCount: number;
    shardCount: number;
    generatedAt: string | null;
  };
};

const relayModeOptions: Array<{ mode: RelayMode; label: string }> = [
  { mode: 'briefing', label: 'Brief' },
  { mode: 'slideshow', label: 'Slides' },
  { mode: 'puppetshow', label: 'Story' },
  { mode: 'field-board', label: 'Map' },
  { mode: 'script', label: 'Script' }
];

const defaultCommand = 'Tell me who to call first this morning';

const statLabels: Record<WorkerStatKey, string> = {
  speed: 'Speed',
  cost: 'Cost',
  precision: 'Accuracy',
  contextFit: 'File Fit'
};

const accentClasses: Record<IntelligenceWorker['accent'], string> = {
  cyan: 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100',
  emerald: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100',
  amber: 'border-amber-300/30 bg-amber-300/10 text-amber-100',
  rose: 'border-rose-300/30 bg-rose-300/10 text-rose-100',
  violet: 'border-violet-300/30 bg-violet-300/10 text-violet-100',
  blue: 'border-sky-300/30 bg-sky-300/10 text-sky-100'
};

export default function AgentSelectionArena() {
  const { logProtocol } = useTheme();
  const commandInputTouched = useRef(false);
  const answerRef = useRef<HTMLElement | null>(null);
  const [command, setCommand] = useState('');
  const [linkedCommand, setLinkedCommand] = useState('');
  const [selectedId, setSelectedId] = useState('lead-scoring');
  const [manualSelection, setManualSelection] = useState(false);
  const [relayMode, setRelayMode] = useState<RelayMode>('briefing');
  const [supervisorEnabled, setSupervisorEnabled] = useState(true);
  const [ranCommand, setRanCommand] = useState(false);
  const [running, setRunning] = useState(false);
  const [commandResult, setCommandResult] = useState<CommandResponse | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [copiedDeliverable, setCopiedDeliverable] = useState(false);
  const [copiedActionId, setCopiedActionId] = useState<string | null>(null);
  const [dailyFact, setDailyFact] = useState<TahFactResponse | null>(null);
  const [factBusy, setFactBusy] = useState(false);
  const [factError, setFactError] = useState('');

  const routingCommand = command.trim() || linkedCommand || defaultCommand;
  const recommended = useMemo(() => chooseWorkerForCommand(routingCommand), [routingCommand]);
  const selected = commandResult
    ? intelligenceWorkers.find((worker) => worker.id === commandResult.worker.id) || recommended
    : intelligenceWorkers.find((worker) => worker.id === selectedId) || recommended;
  const tahLoadoutCount = new Set(intelligenceWorkers.flatMap((worker) => worker.tahLoadout)).size;
  const primaryQuickCommands = quickCommands.slice(0, 6);

  useEffect(() => {
    const initialCommand = new URLSearchParams(window.location.search).get('command');
    if (!initialCommand || commandInputTouched.current) return;

    const nextCommand = initialCommand.trim().slice(0, 600);
    if (!nextCommand) return;

    const nextWorker = chooseWorkerForCommand(nextCommand);
    setLinkedCommand(nextCommand);
    setCommand('');
    setSelectedId(nextWorker.id);
    setManualSelection(false);
    setRanCommand(false);
    setCommandResult(null);
  }, []);

  useEffect(() => {
    if (!commandResult) return;
    window.setTimeout(() => {
      answerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }, [commandResult]);

  const updateCommandDraft = (nextCommand: string) => {
    commandInputTouched.current = true;
    const nextWorker = chooseWorkerForCommand(nextCommand);
    setCommand(nextCommand);
    setLinkedCommand('');
    if (!manualSelection) setSelectedId(nextWorker.id);
    setRanCommand(false);
    setCommandResult(null);
    setCommandError(null);
  };

  const loadDailyFact = async (refresh = false) => {
    setFactBusy(true);
    setFactError('');

    try {
      const url = refresh ? `/api/tah/fact?refresh=${Date.now()}` : '/api/tah/fact';
      const response = await fetch(url, { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'TAH fact unavailable.');
      setDailyFact(body.data?.fact || null);
    } catch (error) {
      setFactError(error instanceof Error ? error.message : 'TAH fact unavailable.');
    } finally {
      setFactBusy(false);
    }
  };

  const runCommand = async () => {
    const commandToRun = command.trim() || linkedCommand || defaultCommand;
    const workerId = manualSelection ? selectedId : recommended.id;
    setSelectedId(workerId);
    setRunning(true);
    setRanCommand(false);
    setCommandError(null);
    logProtocol('DATA', 'Command Center route requested', {
      command,
      commandToRun,
      workerId,
      routeMode: manualSelection ? 'manual' : 'auto',
      relayMode,
      supervisor: supervisorEnabled
    });

    try {
      const response = await fetch('/api/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: commandToRun,
          selectedWorkerId: manualSelection ? workerId : undefined,
          relayMode,
          supervisor: supervisorEnabled
        })
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error || 'Command failed.');
      }

      setCommandResult(body as CommandResponse);
      setRanCommand(true);
      logProtocol('DATA', 'Command Center route completed', {
        commandId: body.commandId,
        worker: body.worker?.id,
        confidence: body.result?.confidence,
        shardCount: body.trace?.selectedShards?.length || 0,
        commandPost: body.trace?.commandPost?.status || 'unavailable'
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Command failed.';
      setCommandError(message);
      logProtocol('DATA', 'Command Center route failed', { command, error: message });
    } finally {
      setRunning(false);
    }
  };

  const submitCommand = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!running) void runCommand();
  };

  const copyDeliverable = async () => {
    const text = commandResult?.result.deliverable.copyReadyText;
    if (!text) return;

    await navigator.clipboard.writeText(text);
    setCopiedDeliverable(true);
    window.setTimeout(() => setCopiedDeliverable(false), 1800);
  };

  const persistActionItem = async (item: CommandActionItem) => {
    if (!commandResult) return;

    try {
      await fetch('/api/commands/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: item.kind === 'external-link',
        body: JSON.stringify({
          commandId: commandResult.commandId,
          command: routingCommand,
          workerId: commandResult.worker.id,
          action: item
        })
      });
    } catch (error) {
      logProtocol('DATA', 'Command action memory failed', {
        commandId: commandResult.commandId,
        action: item.id,
        error: error instanceof Error ? error.message : 'unknown'
      });
    }
  };

  const handleActionItem = async (item: CommandActionItem) => {
    void persistActionItem(item);

    if (item.kind === 'copy' && item.copyText) {
      await navigator.clipboard.writeText(item.copyText);
      setCopiedActionId(item.id);
      window.setTimeout(() => setCopiedActionId(null), 1800);
      return;
    }

    if (item.kind === 'command' && item.command) {
      updateCommandDraft(item.command);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <main className="min-h-screen bg-[#071016] text-white">
      <section className="border-b border-white/10 bg-[#0b1821]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 md:flex-row md:items-end md:justify-between lg:px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
              <Sparkles size={15} />
              Command Center
            </div>
            <h1 className="mt-2 text-3xl font-black uppercase leading-tight md:text-5xl">
              Ask. Get The Answer.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              The helper choice, files, trace, and Command Post details are still here, but the answer gets the front seat.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-right sm:min-w-[330px]">
            <Metric label="Helpers" value={String(intelligenceWorkers.length)} />
            <Metric label="Files" value={String(tahLoadoutCount)} />
            <Metric label="Mode" value={manualSelection ? 'Manual' : 'Auto'} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-5 lg:px-6">
        <form onSubmit={submitCommand} className="border border-cyan-200/20 bg-[#0d1c27] p-3 shadow-2xl shadow-black/20">
          <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            Command
          </label>
          <div className="mt-2 grid gap-3 md:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-4 text-cyan-200" size={19} />
              <textarea
                value={command || linkedCommand}
                onChange={(event) => updateCommandDraft(event.target.value)}
                className="min-h-[72px] w-full resize-y border border-white/10 bg-black/25 py-3 pl-10 pr-3 text-base font-semibold leading-6 text-white outline-none placeholder:text-slate-500 focus:border-cyan-200/50 focus:ring-2 focus:ring-cyan-200/20"
                placeholder="Tell me who to call first this morning..."
              />
            </div>
            <button
              type="submit"
              disabled={running}
              className="inline-flex min-h-[72px] items-center justify-center gap-2 border border-emerald-200/30 bg-emerald-300 px-6 text-sm font-black uppercase tracking-[0.14em] text-slate-950 transition hover:bg-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:cursor-wait disabled:opacity-70"
            >
              <Play size={17} />
              {running ? 'Working' : 'Run'}
            </button>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <label className="grid gap-1">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Helper</span>
                <select
                  value={manualSelection ? selectedId : 'auto'}
                  onChange={(event) => {
                    if (event.target.value === 'auto') {
                      setManualSelection(false);
                      setSelectedId(recommended.id);
                      return;
                    }
                    setManualSelection(true);
                    setSelectedId(event.target.value);
                    setCommandResult(null);
                    setRanCommand(false);
                  }}
                  className="h-10 border border-white/10 bg-black/25 px-3 text-sm font-bold text-white outline-none focus:border-cyan-200/50"
                >
                  <option value="auto">Auto: {recommended.name}</option>
                  {intelligenceWorkers.map((worker) => (
                    <option key={worker.id} value={worker.id}>
                      {worker.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-h-10 items-center justify-between gap-3 border border-white/10 bg-black/25 px-3 sm:mt-6">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-300">Safety Check</span>
                <input
                  type="checkbox"
                  checked={supervisorEnabled}
                  onChange={(event) => setSupervisorEnabled(event.target.checked)}
                  className="h-4 w-4 accent-cyan-300"
                />
              </label>
            </div>

            <div className="grid grid-cols-5 border border-white/10 bg-black/20">
              {relayModeOptions.map((option) => (
                <button
                  key={option.mode}
                  type="button"
                  onClick={() => {
                    setRelayMode(option.mode);
                    setRanCommand(false);
                    setCommandResult(null);
                  }}
                  className={`min-h-10 border-r border-white/10 px-2 text-[10px] font-black uppercase tracking-[0.12em] transition last:border-r-0 ${
                    relayMode === option.mode
                      ? 'bg-cyan-200 text-slate-950'
                      : 'text-slate-300 hover:bg-cyan-200/10 hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {primaryQuickCommands.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => updateCommandDraft(item)}
                className="shrink-0 border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-200 transition hover:border-cyan-200/40 hover:bg-cyan-200/10 hover:text-white"
              >
                {item}
              </button>
            ))}
          </div>
        </form>

        {running ? (
          <section className="mt-4 border border-cyan-200/20 bg-cyan-300/10 p-4" aria-live="polite">
            <div className="flex items-start gap-3">
              <RefreshCw size={18} className="mt-1 shrink-0 animate-spin text-cyan-100" />
              <div>
                <p className="text-sm font-black uppercase tracking-[0.14em] text-cyan-100">Building answer</p>
                <p className="mt-1 text-sm leading-6 text-slate-300">
                  Routing to {manualSelection ? selected.name : recommended.name}, reading the attached TAH files, and checking the output.
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {commandError ? (
          <section className="mt-4 border border-rose-300/30 bg-rose-300/10 p-4 text-sm font-bold text-rose-100">
            {commandError}
          </section>
        ) : null}

        <section ref={answerRef} className="mt-4 scroll-mt-4">
          {commandResult ? (
            <AnswerPanel
              commandResult={commandResult}
              copiedDeliverable={copiedDeliverable}
              copiedActionId={copiedActionId}
              onCopyDeliverable={copyDeliverable}
              onActionItem={handleActionItem}
            />
          ) : (
            <ReadyPanel selected={selected} ranCommand={ranCommand} />
          )}
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-3">
            {commandResult ? (
              <>
                <Disclosure title="Sources And Search Trace" icon={Layers3} defaultOpen>
                  <SourcesAndTrace commandResult={commandResult} />
                </Disclosure>
                <Disclosure title="Deliverable Frames" icon={BookOpen}>
                  <DeliverableFrames commandResult={commandResult} />
                </Disclosure>
                <Disclosure title="Relay Plan" icon={ClipboardList}>
                  <RelayPlanPanel commandResult={commandResult} />
                </Disclosure>
              </>
            ) : null}
            <Disclosure title="Helper Directory" icon={Gauge}>
              <HelperDirectory selected={selected} recommended={recommended} />
            </Disclosure>
          </div>

          <div className="space-y-3">
            <SelectedHelperPanel selected={selected} />
            <Disclosure title="Command Post" icon={TerminalSquare}>
              <CommandPostPanel commandResult={commandResult} />
            </Disclosure>
            <Disclosure title="TAH Note" icon={BookOpen}>
              <TahNotePanel
                dailyFact={dailyFact}
                factBusy={factBusy}
                factError={factError}
                onLoad={() => loadDailyFact(Boolean(dailyFact))}
              />
            </Disclosure>
          </div>
        </section>
      </section>
    </main>
  );
}

function AnswerPanel({
  commandResult,
  copiedDeliverable,
  copiedActionId,
  onCopyDeliverable,
  onActionItem
}: {
  commandResult: CommandResponse;
  copiedDeliverable: boolean;
  copiedActionId: string | null;
  onCopyDeliverable: () => void;
  onActionItem: (item: CommandActionItem) => Promise<void>;
}) {
  return (
    <div className="border border-emerald-200/25 bg-[#0d1c27] p-4 shadow-2xl shadow-black/20">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="border border-emerald-200/30 bg-emerald-300/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100">
              Answer
            </span>
            <span className="border border-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              {commandResult.worker.name}
            </span>
            <span className="border border-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              {commandResult.result.confidence}% confidence
            </span>
          </div>
          <h2 className="mt-3 text-2xl font-black leading-tight text-white md:text-3xl">
            {glossaryText(commandResult.result.title)}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
            {glossaryText(commandResult.result.summary)}
          </p>
        </div>
        <button
          type="button"
          onClick={onCopyDeliverable}
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 border border-emerald-200/40 px-3 text-xs font-black uppercase tracking-[0.14em] text-emerald-100 transition hover:bg-emerald-200 hover:text-slate-950"
        >
          {copiedDeliverable ? <Check size={14} /> : <Copy size={14} />}
          {copiedDeliverable ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {commandResult.result.actions.map((action) => (
          <div key={action} className="border border-white/10 bg-black/20 p-3">
            <div className="flex gap-2 text-sm leading-6 text-slate-200">
              <ChevronRight size={16} className="mt-1 shrink-0 text-emerald-100" />
              <span>{glossaryText(action)}</span>
            </div>
          </div>
        ))}
      </div>

      {commandResult.result.civicRecord ? (
        <div className="mt-4">
          <ParsedRecordCard record={commandResult.result.civicRecord} />
        </div>
      ) : null}

      {commandResult.result.actionItems?.length ? (
        <div className="mt-4">
          <CommandActionPanel
            actions={commandResult.result.actionItems}
            copiedActionId={copiedActionId}
            saved={Boolean(commandResult.trace.queryMemory?.saved)}
            onAction={onActionItem}
          />
        </div>
      ) : null}
    </div>
  );
}

function ReadyPanel({ selected, ranCommand }: { selected: IntelligenceWorker; ranCommand: boolean }) {
  return (
    <div className="border border-white/10 bg-[#0d1c27] p-4">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
        <Activity size={15} />
        Ready
      </div>
      <h2 className="mt-3 text-xl font-black text-white">{ranCommand ? selected.sampleOutput.title : selected.name}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{selected.role}</p>
      <div className="mt-4 grid gap-2 md:grid-cols-3">
        {selected.sampleOutput.bullets.map((bullet) => (
          <div key={bullet} className="border border-white/10 bg-black/20 p-3 text-sm leading-6 text-slate-300">
            {bullet}
          </div>
        ))}
      </div>
    </div>
  );
}

function SelectedHelperPanel({ selected }: { selected: IntelligenceWorker }) {
  const Icon = selected.icon;
  return (
    <section className={`border p-4 ${accentClasses[selected.accent]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-80">{selected.slot} Helper</p>
          <h2 className="mt-2 text-xl font-black text-white">{selected.name}</h2>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-white text-slate-950">
          <Icon size={22} />
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-200">{selected.role}</p>
      <div className="mt-4 space-y-3">
        {(Object.keys(selected.stats) as WorkerStatKey[]).map((key) => (
          <StatBar key={key} label={statLabels[key]} value={selected.stats[key]} />
        ))}
      </div>
    </section>
  );
}

function HelperDirectory({
  selected,
  recommended
}: {
  selected: IntelligenceWorker;
  recommended: IntelligenceWorker;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
      {intelligenceWorkers.map((worker) => {
        const Icon = worker.icon;
        const isSelected = worker.id === selected.id;
        const isRecommended = worker.id === recommended.id;
        return (
          <div
            key={worker.id}
            className={`min-h-28 border p-3 ${isSelected ? accentClasses[worker.accent] : 'border-white/10 bg-black/20'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-1">
                  {isRecommended && (
                    <span className="border border-emerald-200/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-100">
                      Auto
                    </span>
                  )}
                  <span className="border border-white/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                    {worker.status}
                  </span>
                </div>
                <p className="mt-2 text-sm font-black text-white">{worker.name}</p>
              </div>
              <Icon size={18} className="shrink-0 text-cyan-100" />
            </div>
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-300">{worker.role}</p>
          </div>
        );
      })}
    </div>
  );
}

function SourcesAndTrace({ commandResult }: { commandResult: CommandResponse }) {
  return (
    <div className="space-y-3">
      {commandResult.trace.selectedShards.length ? (
        <div className="grid gap-2 md:grid-cols-3">
          {commandResult.trace.selectedShards.slice(0, 6).map((shard) => (
            <div key={`${shard.expertId}-${shard.source}`} className="border border-white/10 bg-black/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-xs font-black text-cyan-100">{shard.title}</p>
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                  {formatMatchScore(shard.score)}
                </span>
              </div>
              <p className="mt-1 truncate font-mono text-[10px] text-slate-500">{shard.source}</p>
              <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-300">{glossaryText(shard.excerpt)}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-300">No source shards were returned.</p>
      )}

      {commandResult.trace.retrievalPolicy ? (
        <div className="border border-cyan-200/20 bg-cyan-300/10 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">
            Search Path
          </p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {commandResult.trace.retrievalPolicy.stages.map((stage) => (
              <div key={stage.name} className="border border-white/10 bg-[#071016] px-2 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100">
                    {formatSearchStage(stage.name)}
                  </p>
                  <span className="font-mono text-[10px] text-slate-500">{stage.kept}/{stage.input}</span>
                </div>
                <div className="mt-2 h-1.5 bg-black/40">
                  <div
                    className="h-full bg-cyan-300"
                    style={{ width: `${stage.input ? Math.max(6, Math.round((stage.kept / stage.input) * 100)) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DeliverableFrames({ commandResult }: { commandResult: CommandResponse }) {
  return (
    <div className="space-y-2">
      <p className="text-sm leading-6 text-slate-300">{glossaryText(commandResult.result.deliverable.sourceSummary)}</p>
      {commandResult.result.deliverable.frames.map((frame) => (
        <div key={`${frame.label}-${frame.title}`} className="border border-white/10 bg-black/20 p-3">
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100">{frame.label}</p>
          <p className="mt-1 text-sm font-black text-white">{glossaryText(frame.title)}</p>
          <p className="mt-2 text-xs leading-5 text-slate-200">{glossaryText(frame.body)}</p>
          <p className="mt-2 text-xs leading-5 text-slate-400">{glossaryText(frame.speakerNote)}</p>
        </div>
      ))}
    </div>
  );
}

function RelayPlanPanel({ commandResult }: { commandResult: CommandResponse }) {
  const plan = commandResult.result.relayPlan;
  return (
    <div className="space-y-3">
      <div className="border border-white/10 bg-black/20 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-black text-white">{plan.templateName}</p>
            <p className="mt-1 text-xs leading-5 text-slate-300">{glossaryText(plan.purpose)}</p>
          </div>
          <span className="shrink-0 border border-amber-200/30 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-100">
            {formatRelayMode(plan.mode)}
          </span>
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <DetailBlock label="Style" value={plan.format.name} detail={plan.format.useWhen} />
        <DetailBlock label="Tone" value={plan.words.voice} />
        <DetailBlock label="Visual" value={plan.visual.motif} detail={plan.visual.layout} />
        <DetailBlock label="Avoids" value={plan.words.avoid.slice(0, 3).join(', ')} />
      </div>
    </div>
  );
}

function CommandPostPanel({ commandResult }: { commandResult: CommandResponse | null }) {
  const commandPost = commandResult?.trace.commandPost;
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm leading-6 text-slate-300">
          Operator console status and system checks live here now, away from the answer.
        </p>
        <Link
          href="/admin/orchestrator"
          className="inline-flex min-h-9 shrink-0 items-center gap-2 border border-cyan-200/30 px-3 text-xs font-black uppercase tracking-[0.12em] text-cyan-100 transition hover:bg-cyan-200 hover:text-slate-950"
        >
          Open
          <ExternalLink size={13} />
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <DevMetric label="Status" value={commandPost?.status || 'standby'} />
        <DevMetric label="Waiting" value={String(commandPost?.pendingTerminalIntentCount ?? 0)} />
        <DevMetric label="Archive" value={commandPost?.masterArchive?.status || 'pending'} />
        <DevMetric label="Notes" value={String(commandPost?.masterArchive?.shardCount ?? commandResult?.trace.atlasDiagnostics?.totalSegments ?? 0)} />
        <DevMetric label="Search" value={commandResult?.trace.retrievalPolicy ? 'active' : 'standby'} />
        <DevMetric label="Saved" value={commandResult?.trace.queryMemory?.status || 'standby'} />
      </div>
      <p className="mt-3 break-all font-mono text-[10px] text-slate-500">
        {commandPost?.endpoint || '/api/admin/orchestrator/command'}
      </p>
      {commandPost?.statusProbe ? (
        <div className="mt-3 border border-white/10 bg-[#071016] p-2">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">
            {commandPost.statusProbe.action}
          </p>
          <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-xs leading-5 text-slate-300">
            {commandPost.statusProbe.reply}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function TahNotePanel({
  dailyFact,
  factBusy,
  factError,
  onLoad
}: {
  dailyFact: TahFactResponse | null;
  factBusy: boolean;
  factError: string;
  onLoad: () => void;
}) {
  return (
    <div>
      {dailyFact ? (
        <>
          <p className="text-sm leading-6 text-slate-200">{glossaryText(dailyFact.blurb)}</p>
          <div className="mt-3 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">
            <span>{dailyFact.title}</span>
            {dailyFact.source && <span>{dailyFact.source}</span>}
            <span>Note {dailyFact.shardIndex}</span>
            <span>{dailyFact.archive.shardCount} notes</span>
          </div>
        </>
      ) : (
        <p className="text-sm leading-6 text-slate-300">{factError || 'Load a random TAH note when you want ambient context.'}</p>
      )}
      <button
        type="button"
        onClick={onLoad}
        disabled={factBusy}
        className="mt-3 inline-flex min-h-9 items-center justify-center gap-2 border border-cyan-200/30 px-3 text-xs font-black uppercase tracking-[0.14em] text-cyan-100 transition hover:bg-cyan-200 hover:text-slate-950 disabled:opacity-50"
      >
        <RefreshCw size={14} className={factBusy ? 'animate-spin' : ''} />
        {dailyFact ? 'Shuffle' : 'Load Note'}
      </button>
    </div>
  );
}

function Disclosure({
  title,
  icon: Icon,
  defaultOpen = false,
  children
}: {
  title: string;
  icon: typeof Activity;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="border border-white/10 bg-[#0d1c27]" open={defaultOpen}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 border-b border-white/10 px-4 text-xs font-black uppercase tracking-[0.16em] text-slate-300 marker:hidden">
        <Icon size={15} className="text-cyan-100" />
        {title}
      </summary>
      <div className="p-4">{children}</div>
    </details>
  );
}

function DetailBlock({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="border border-white/10 bg-black/20 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-white">{glossaryText(value)}</p>
      {detail ? <p className="mt-1 text-xs leading-5 text-slate-300">{glossaryText(detail)}</p> : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 bg-white/[0.04] px-3 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-xl font-black text-white">{value}</p>
    </div>
  );
}

function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</span>
        <span className="font-mono text-xs font-black text-white">{value}</span>
      </div>
      <div className="mt-1 h-1.5 bg-black/40">
        <div className="h-full bg-cyan-300" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function DevMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 bg-[#071016] px-2 py-2">
      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 truncate font-mono text-xs font-black text-white">{value}</p>
    </div>
  );
}

function formatRelayMode(mode: RelayMode) {
  const labels: Record<RelayMode, string> = {
    briefing: 'brief',
    slideshow: 'slides',
    puppetshow: 'story',
    'field-board': 'map',
    script: 'script'
  };
  return labels[mode];
}

function formatMatchScore(score: number) {
  if (score >= 100) return 'high';
  if (score >= 60) return 'good';
  return 'light';
}

function formatSearchStage(name: string) {
  const stages: Record<string, string> = {
    'metadata filter': 'Checked file info',
    'concept match': 'Matched words',
    'density vitality rank': 'Ranked useful notes',
    'compact context output': 'Kept best notes',
    'virtual loadout fallback': 'Used helper files'
  };
  return stages[name] || name.replace(/[_-]+/g, ' ');
}
