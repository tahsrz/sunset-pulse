'use client';

import Link from 'next/link';
import { CommandPostPanel, TahNotePanel, type TahFactResponse } from './results/CommandDetails';
import type { FullCommandResponse as CommandResponse, RelayMode } from '@/lib/command-center/commandTypes';
import { CommandSources as SourcesAndTrace } from './results/CommandSources';
import { buildApprovedListingCommand, type ListingReviewDraft } from '@/lib/command-center/listingReviewHelpers';
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
  MessageSquareText,
  Pencil,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  TerminalSquare
} from 'lucide-react';
import { useTheme } from '@/context/ThemeProvider';
import { renderGlossaryText as glossaryText } from '@/components/glossary/GlossaryText';
import { CommandActionPanel } from './CommandActionPanel';
import { CommandRouteDirectory } from './CommandRouteDirectory';
import { ParsedRecordCard } from './ParsedRecordCard';
import { CommandAnswer, CommandProgressRail } from './results/CommandAnswer';
import { CommandDeliverables, CommandRelayPlan } from './results/CommandDeliverables';
import type { CivicServiceRecord, CommandActionItem } from '@/lib/command-center/actionTypes';
import {
  chooseWorkerForCommand,
  intelligenceWorkers,
  quickCommands,
  type IntelligenceWorker,
  type WorkerStatKey
} from '@/lib/command-center/workerRoster';

type CommandProgressEvent = NonNullable<CommandResponse['trace']['progress']>[number];
type CommandSupervisorReviewUiTrace = NonNullable<CommandResponse['trace']['supervisorReview']>;
type ListingFactsTrace = NonNullable<CommandResponse['trace']['listingFacts']>;

const relayModeOptions: Array<{ mode: RelayMode; label: string }> = [
  { mode: 'briefing', label: 'Brief' },
  { mode: 'slideshow', label: 'Slides' },
  { mode: 'puppetshow', label: 'Story' },
  { mode: 'field-board', label: 'Map' },
  { mode: 'script', label: 'Script' }
];

const defaultCommand = 'Tell me who to call first this morning';
const commandMaxLength = 20000;

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

type AgentSelectionArenaProps = {
  embedded?: boolean;
};

export default function AgentSelectionArena({ embedded = false }: AgentSelectionArenaProps) {
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
  const [liveProgress, setLiveProgress] = useState<CommandProgressEvent[]>([]);
  const [copiedDeliverable, setCopiedDeliverable] = useState(false);
  const [copiedActionId, setCopiedActionId] = useState<string | null>(null);
  const [dailyFact, setDailyFact] = useState<TahFactResponse | null>(null);
  const [factBusy, setFactBusy] = useState(false);
  const [factError, setFactError] = useState('');
  const [hydrated, setHydrated] = useState(false);

  const routingCommand = command.trim() || linkedCommand || defaultCommand;
  const recommended = useMemo(() => chooseWorkerForCommand(routingCommand), [routingCommand]);
  const selected = commandResult
    ? intelligenceWorkers.find((worker) => worker.id === commandResult.worker.id) || recommended
    : intelligenceWorkers.find((worker) => worker.id === selectedId) || recommended;
  const sourceLoadoutCount = new Set(intelligenceWorkers.flatMap((worker) => worker.tahLoadout)).size;
  const primaryQuickCommands = quickCommands.slice(0, 6);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    const initialCommand = new URLSearchParams(window.location.search).get('command');
    if (!initialCommand || commandInputTouched.current) return;

    const nextCommand = initialCommand.trim().slice(0, commandMaxLength);
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
    const intakeId = new URLSearchParams(window.location.search).get('intake');
    if (!intakeId || commandInputTouched.current) return;
    let cancelled = false;

    void fetch(`/api/command-center/listing-intakes/${intakeId}`)
      .then(safeJson)
      .then((body) => {
        const savedCommand = body?.data?.intake?.sourceCommand;
        if (cancelled || typeof savedCommand !== 'string' || !savedCommand.trim()) return;
        const nextCommand = savedCommand.trim().slice(0, commandMaxLength);
        const nextWorker = chooseWorkerForCommand(nextCommand);
        commandInputTouched.current = true;
        setCommand(nextCommand);
        setLinkedCommand('');
        setSelectedId(nextWorker.id);
        setManualSelection(false);
        setRanCommand(false);
        setCommandResult(null);
        setCommandError(null);
        setLiveProgress([]);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
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
    setLiveProgress([]);
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

  const sendTensorZeroFeedback = async (
    result: CommandResponse | null,
    input: {
      metricName: 'command_center_usefulness' | 'command_center_actionability' | 'command_center_routing_correction' | 'command_center_needs_improvement';
      value: boolean | number | string;
      source: 'copy_answer' | 'action_click' | 'manual_helper_override' | 'rerun_command';
      context?: Record<string, string | number | boolean | null>;
    }
  ) => {
    if (!result) return;

    try {
      await fetch('/api/tensorzero/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          metricName: input.metricName,
          value: input.value,
          source: input.source,
          commandId: result.commandId,
          episodeId: result.commandId,
          evaluationId: result.trace.tensorzero?.evaluationId,
          workerId: result.worker.id,
          variantName: result.trace.tensorzero?.variantName,
          context: input.context
        })
      });
    } catch (error) {
      logProtocol('DATA', 'TensorZero feedback failed', {
        commandId: result.commandId,
        metricName: input.metricName,
        error: error instanceof Error ? error.message : 'unknown'
      });
    }
  };

  const runCommand = async (forcedWorkerId?: string, commandOverride?: string) => {
    const commandToRun = commandOverride || command.trim() || linkedCommand || defaultCommand;
    const workerId = forcedWorkerId || (manualSelection ? selectedId : recommended.id);
    const previousResult = commandResult;
    if (previousResult) {
      void sendTensorZeroFeedback(previousResult, {
        metricName: 'command_center_needs_improvement',
        value: true,
        source: 'rerun_command',
        context: {
          previousWorkerId: previousResult.worker.id,
          nextWorkerId: workerId,
          relayMode
        }
      });
    }
    setSelectedId(workerId);
    setRunning(true);
    setRanCommand(false);
    setCommandError(null);
    setCommandResult(null);
    setLiveProgress([{
      id: 'submitted',
      label: 'Submitted',
      status: 'complete',
      detail: manualSelection || forcedWorkerId ? 'Manual helper route' : 'Auto helper route',
    }]);
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
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          command: commandToRun,
          selectedWorkerId: manualSelection || forcedWorkerId ? workerId : undefined,
          relayMode,
          supervisor: supervisorEnabled
        })
      });

      if (!response.ok) {
        const body = await safeJson(response);
        throw new Error(body?.error || 'Command failed.');
      }

      const body = await readCommandStream(response, (event) => {
        setLiveProgress((current) => upsertProgressEvent(current, event));
      });
      const finalResult = { ...(body as CommandResponse), commandText: commandToRun };
      setCommandResult(finalResult);
      setLiveProgress(finalResult.trace.progress || []);
      setRanCommand(true);
      if (supervisorEnabled) void requestSupervisorReview(finalResult, commandToRun);
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
    const result = commandResult;
    const text = result?.result.deliverable.copyReadyText;
    if (!text) return;

    await navigator.clipboard.writeText(text);
    void sendTensorZeroFeedback(result, {
      metricName: 'command_center_usefulness',
      value: true,
      source: 'copy_answer',
      context: {
        copiedChars: text.length,
        workerId: result.worker.id,
        relayMode: result.result.relayPlan.mode
      }
    });
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
          command: commandResult.commandText || routingCommand,
          workerId: commandResult.worker.id,
          action: item,
          tensorzero: {
            evaluationId: commandResult.trace.tensorzero?.evaluationId,
            variantName: commandResult.trace.tensorzero?.variantName
          }
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

  const recordManualHelperOverride = (nextWorkerId: string) => {
    if (!commandResult || nextWorkerId === commandResult.worker.id) return;

    void sendTensorZeroFeedback(commandResult, {
      metricName: 'command_center_routing_correction',
      value: true,
      source: 'manual_helper_override',
      context: {
        previousWorkerId: commandResult.worker.id,
        nextWorkerId,
        recommendedWorkerId: recommended.id
      }
    });
  };

  const rerunWithWorker = (nextWorkerId: string) => {
    if (!nextWorkerId || nextWorkerId === commandResult?.worker.id) return;
    recordManualHelperOverride(nextWorkerId);
    setManualSelection(true);
    setSelectedId(nextWorkerId);
    void runCommand(nextWorkerId);
  };

  const rerunWithApprovedListing = (draft: ListingReviewDraft) => {
    const commandOverride = buildApprovedListingCommand(draft);
    const currentWorkerId = commandResult?.worker.id;
    commandInputTouched.current = true;
    setCommand(commandOverride);
    setLinkedCommand('');
    if (currentWorkerId) {
      setManualSelection(true);
      setSelectedId(currentWorkerId);
    }
    void runCommand(currentWorkerId, commandOverride);
  };

  const requestSupervisorReview = async (result: CommandResponse, commandToRun: string) => {
    try {
      const response = await fetch('/api/commands/supervisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          commandId: result.commandId,
          command: commandToRun,
          workerId: result.worker.id,
          workerName: result.worker.name,
          intent: result.intent,
          summary: result.result.summary,
          selectedShards: result.trace.selectedShards.map((shard) => ({
            source: shard.source,
            title: shard.title,
            score: shard.score,
          })),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || 'Supervisor review failed.');
      const queuedTrace = body.trace as CommandResponse['trace']['supervisorReview'];
      setCommandResult((current) => current?.commandId === result.commandId
        ? {
          ...current,
          trace: {
            ...current.trace,
            supervisorReview: queuedTrace,
          },
        }
        : current);
      if (queuedTrace?.status === 'queued') {
        void processSupervisorReviews(result.commandId, queuedTrace);
      }
    } catch (error) {
      logProtocol('DATA', 'Supervisor review queue failed', {
        commandId: result.commandId,
        error: error instanceof Error ? error.message : 'unknown',
      });
    }
  };

  const processSupervisorReviews = async (
    commandId: string,
    queuedTrace: CommandSupervisorReviewUiTrace
  ) => {
    try {
      const response = await fetch('/api/commands/supervisor', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({ limit: 5 }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || 'Supervisor processing failed.');
      const processed = (body.snapshot?.recent || []).find((review: {
        id?: string;
        status?: CommandSupervisorReviewUiTrace['status'];
        severity?: CommandSupervisorReviewUiTrace['severity'];
        findings?: unknown[];
      }) => review.id === queuedTrace.reviewId);
      if (!processed) return;

      setCommandResult((current) => current?.commandId === commandId
        ? {
          ...current,
          trace: {
            ...current.trace,
            supervisorReview: {
              ...queuedTrace,
              status: processed.status || queuedTrace.status,
              severity: processed.severity,
              findingCount: Array.isArray(processed.findings) ? processed.findings.length : undefined,
            },
          },
        }
        : current);
    } catch (error) {
      logProtocol('DATA', 'Supervisor review process failed', {
        commandId,
        error: error instanceof Error ? error.message : 'unknown',
      });
    }
  };

  return (
    <main className={embedded ? 'h-full min-h-0 overflow-y-auto bg-[#071016] text-white' : 'min-h-screen bg-[#071016] text-white'}>
      <section className="border-b border-white/10 bg-[#0b1821]">
        <div className={embedded ? 'flex flex-col gap-4 px-5 py-5' : 'mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 md:flex-row md:items-end md:justify-between lg:px-6'}>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
              <Sparkles size={15} />
              Command Center
            </div>
            <h1 className={embedded ? 'mt-2 text-4xl font-black uppercase leading-[0.96]' : 'mt-2 text-3xl font-black uppercase leading-tight md:text-5xl'}>
              Ask. Get The Answer.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              The helper choice, files, trace, and Command Post details are still here, but the answer gets the front seat.
            </p>
          </div>
          <div className={embedded ? 'grid grid-cols-3 gap-2 text-right' : 'grid gap-3 sm:min-w-[330px]'}>
            {!embedded ? (
              <Link
                href="/agent"
                className="inline-flex min-h-10 items-center justify-center gap-2 border border-emerald-200/25 bg-emerald-300 px-4 text-xs font-black uppercase tracking-[0.14em] text-slate-950 transition hover:bg-emerald-200"
              >
                <MessageSquareText size={15} />
                Agent Console
              </Link>
            ) : null}
            <div className="grid grid-cols-3 gap-2 text-right">
              <Metric label="Helpers" value={String(intelligenceWorkers.length)} />
              <Metric label="Sources" value={String(sourceLoadoutCount)} />
              <Metric label="Mode" value={manualSelection ? 'Manual' : 'Auto'} />
            </div>
          </div>
        </div>
      </section>

      <section className={embedded ? 'px-5 py-5' : 'mx-auto max-w-6xl px-4 py-5 lg:px-6'}>
        <CommandRouteDirectory />
        <form onSubmit={submitCommand} className="border border-cyan-200/20 bg-[#0d1c27] p-3 shadow-2xl shadow-black/20">
          <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            Command
          </label>
          <div className={embedded ? 'mt-2 grid gap-3' : 'mt-2 grid gap-3 md:grid-cols-[1fr_auto]'}>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-4 text-cyan-200" size={19} />
              <textarea
                aria-label="Command"
                value={command || linkedCommand}
                onChange={(event) => updateCommandDraft(event.target.value)}
                className="min-h-[72px] w-full resize-y border border-white/10 bg-black/25 py-3 pl-10 pr-3 text-base font-semibold leading-6 text-white outline-none placeholder:text-slate-500 focus:border-cyan-200/50 focus:ring-2 focus:ring-cyan-200/20"
                placeholder="Tell me who to call first this morning..."
              />
            </div>
            <button
              type="submit"
              aria-label="Run command"
              disabled={!hydrated || running}
              className="inline-flex min-h-[72px] items-center justify-center gap-2 border border-emerald-200/30 bg-emerald-300 px-6 text-sm font-black uppercase tracking-[0.14em] text-slate-950 transition hover:bg-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:cursor-wait disabled:opacity-70"
            >
              <Play size={17} />
              {running ? 'Working' : 'Run'}
            </button>
          </div>

          <div className={embedded ? 'mt-3 grid gap-3' : 'mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center'}>
            <div className={embedded ? 'grid gap-2' : 'grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center'}>
              <label className="grid gap-1">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Helper</span>
                <select
                  aria-label="Helper"
                  value={manualSelection ? selectedId : 'auto'}
                  onChange={(event) => {
                    if (event.target.value === 'auto') {
                      setManualSelection(false);
                      setSelectedId(recommended.id);
                      return;
                    }
                    recordManualHelperOverride(event.target.value);
                    setManualSelection(true);
                    setSelectedId(event.target.value);
                    setCommandResult(null);
                    setRanCommand(false);
                  }}
                  className="h-10 min-w-0 border border-white/10 bg-black/25 px-3 text-sm font-bold text-white outline-none focus:border-cyan-200/50"
                >
                  <option value="auto">Auto: {recommended.name}</option>
                  {intelligenceWorkers.map((worker) => (
                    <option key={worker.id} value={worker.id}>
                      {worker.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={embedded ? 'flex min-h-10 items-center justify-between gap-3 border border-white/10 bg-black/25 px-3' : 'flex min-h-10 items-center justify-between gap-3 border border-white/10 bg-black/25 px-3 sm:mt-6'}>
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

          <div className={embedded ? 'mt-3 flex flex-wrap gap-2 pb-1' : 'mt-3 flex gap-2 overflow-x-auto pb-1'}>
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
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black uppercase tracking-[0.14em] text-cyan-100">Building answer</p>
                <p className="mt-1 text-sm leading-6 text-slate-300">
                  Routing to {manualSelection ? selected.name : recommended.name}, reading saved context, and checking the output.
                </p>
                <CommandProgressRail progress={liveProgress} />
              </div>
            </div>
          </section>
        ) : null}

        {commandError ? (
          <section className="mt-4 border border-rose-300/30 bg-rose-300/10 p-4 text-sm font-bold text-rose-100">
            {commandError}
          </section>
        ) : null}

        <section ref={answerRef} className="mt-4 scroll-mt-28 md:scroll-mt-32">
          {commandResult ? (
            <CommandAnswer
              commandResult={commandResult}
              copiedDeliverable={copiedDeliverable}
              copiedActionId={copiedActionId}
              onCopyDeliverable={copyDeliverable}
              onActionItem={handleActionItem}
              onRerunWithWorker={rerunWithWorker}
            />
          ) : (
            <ReadyPanel selected={selected} ranCommand={ranCommand} />
          )}
        </section>

        <section className={embedded ? 'mt-4 grid gap-4' : 'mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]'}>
          <div className="space-y-3">
            {commandResult ? (
              <>
                <Disclosure title="Sources And Search Trace" icon={Layers3} defaultOpen>
                  <SourcesAndTrace
                    commandResult={commandResult}
                    onRerunWithApprovedListing={rerunWithApprovedListing}
                    running={running}
                  />
                </Disclosure>
                <Disclosure title="Deliverable Frames" icon={BookOpen}>
                  <CommandDeliverables commandResult={commandResult} />
                </Disclosure>
                <Disclosure title="Relay Plan" icon={ClipboardList}>
                  <CommandRelayPlan commandResult={commandResult} />
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

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function readCommandStream(
  response: Response,
  onProgress: (event: CommandProgressEvent) => void
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
        throw new Error(errorData.error || 'Command failed.');
      }
    }

    if (done) break;
  }

  if (!result) throw new Error('Command stream ended without a result.');
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
