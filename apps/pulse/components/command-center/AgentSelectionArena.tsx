'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BookOpen,
  Bot,
  Check,
  ChevronRight,
  Command,
  Cpu,
  ExternalLink,
  Gauge,
  Layers3,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  TerminalSquare,
  Zap
} from 'lucide-react';
import { useTheme } from '@/context/ThemeProvider';
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

const accentClasses: Record<IntelligenceWorker['accent'], {
  tile: string;
  icon: string;
  selected: string;
  meter: string;
  text: string;
}> = {
  cyan: {
    tile: 'border-cyan-300/30 bg-cyan-300/[0.07]',
    icon: 'bg-cyan-300 text-slate-950',
    selected: 'ring-cyan-200 shadow-cyan-950/40',
    meter: 'bg-cyan-300',
    text: 'text-cyan-100'
  },
  emerald: {
    tile: 'border-emerald-300/30 bg-emerald-300/[0.07]',
    icon: 'bg-emerald-300 text-slate-950',
    selected: 'ring-emerald-200 shadow-emerald-950/40',
    meter: 'bg-emerald-300',
    text: 'text-emerald-100'
  },
  amber: {
    tile: 'border-amber-300/35 bg-amber-300/[0.08]',
    icon: 'bg-amber-300 text-slate-950',
    selected: 'ring-amber-200 shadow-amber-950/40',
    meter: 'bg-amber-300',
    text: 'text-amber-100'
  },
  rose: {
    tile: 'border-rose-300/30 bg-rose-300/[0.07]',
    icon: 'bg-rose-300 text-slate-950',
    selected: 'ring-rose-200 shadow-rose-950/40',
    meter: 'bg-rose-300',
    text: 'text-rose-100'
  },
  violet: {
    tile: 'border-violet-300/30 bg-violet-300/[0.07]',
    icon: 'bg-violet-300 text-slate-950',
    selected: 'ring-violet-200 shadow-violet-950/40',
    meter: 'bg-violet-300',
    text: 'text-violet-100'
  },
  blue: {
    tile: 'border-sky-300/30 bg-sky-300/[0.07]',
    icon: 'bg-sky-300 text-slate-950',
    selected: 'ring-sky-200 shadow-sky-950/40',
    meter: 'bg-sky-300',
    text: 'text-sky-100'
  }
};

const statLabels: Record<WorkerStatKey, string> = {
  speed: 'Speed',
  cost: 'Cost',
  precision: 'Precision',
  contextFit: 'Context'
};

const relayModeOptions: Array<{ mode: RelayMode; label: string }> = [
  { mode: 'briefing', label: 'Brief' },
  { mode: 'slideshow', label: 'Slides' },
  { mode: 'puppetshow', label: 'Puppet' },
  { mode: 'field-board', label: 'Board' },
  { mode: 'script', label: 'Script' }
];

export default function AgentSelectionArena() {
  const { logProtocol } = useTheme();
  const [command, setCommand] = useState('Tell me who to call first this morning');
  const [selectedId, setSelectedId] = useState('lead-scoring');
  const [manualSelection, setManualSelection] = useState(false);
  const [relayMode, setRelayMode] = useState<RelayMode>('briefing');
  const [supervisorEnabled, setSupervisorEnabled] = useState(true);
  const [ranCommand, setRanCommand] = useState(false);
  const [running, setRunning] = useState(false);
  const [commandResult, setCommandResult] = useState<CommandResponse | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [dailyFact, setDailyFact] = useState<TahFactResponse | null>(null);
  const [factBusy, setFactBusy] = useState(false);
  const [factError, setFactError] = useState('');

  const recommended = useMemo(() => chooseWorkerForCommand(command), [command]);
  const selected = commandResult
    ? intelligenceWorkers.find((worker) => worker.id === commandResult.worker.id) || recommended
    : intelligenceWorkers.find((worker) => worker.id === selectedId) || recommended;
  const voiceWorker = intelligenceWorkers.find((worker) => worker.id === 'agent-voice')!;
  const supervisorWorker = intelligenceWorkers.find((worker) => worker.id === 'supervisor')!;
  const accent = accentClasses[selected.accent];

  const teamSlots = [
    { label: 'Router', value: 'TAH Router', icon: Command },
    { label: 'Primary', value: selected.name, icon: selected.icon },
    { label: 'Voice', value: voiceWorker.name, icon: voiceWorker.icon },
    { label: 'Check', value: supervisorEnabled ? supervisorWorker.name : 'Off', icon: ShieldCheck }
  ];

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

  useEffect(() => {
    loadDailyFact();
  }, []);

  const runCommand = async () => {
    const workerId = manualSelection ? selectedId : recommended.id;
    setSelectedId(workerId);
    setRunning(true);
    setRanCommand(false);
    setCommandError(null);
    logProtocol('DATA', 'Command Center route requested', {
      command,
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
          command,
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

  return (
    <section className="min-h-screen bg-[#071016] text-white">
      <div className="border-b border-white/10 bg-[#0b1821]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 lg:flex-row lg:items-end lg:justify-between lg:px-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-100">
              <Cpu size={16} />
              Private Market Intelligence
            </div>
            <h1 className="mt-2 text-3xl font-black uppercase leading-tight text-white md:text-5xl">
              Select Your Intelligence Team
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Command narrow real estate workers loaded with private TAH context.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-right sm:min-w-[420px]">
            <Metric label="Workers" value="12" />
            <Metric label="TAH Loadouts" value="8" />
            <Metric label="Mode" value="Auto" />
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 lg:grid-cols-[1fr_360px] lg:px-6">
        <div className="min-w-0">
          <div className="border border-white/10 bg-[#0d1c27] p-3 shadow-2xl shadow-black/20">
            <div className="flex flex-col gap-3 md:flex-row">
              <label className="relative flex min-h-14 flex-1 items-center border border-white/10 bg-black/25 px-3">
                <Search className="mr-3 shrink-0 text-cyan-200" size={19} />
                <input
                  value={command}
                  onChange={(event) => {
                    setCommand(event.target.value);
                    setManualSelection(false);
                    setRanCommand(false);
                    setCommandResult(null);
                  }}
                  className="h-12 w-full bg-transparent text-base font-semibold text-white outline-none placeholder:text-slate-500"
                  placeholder="Tell me who to call first..."
                />
              </label>
              <button
                type="button"
                onClick={runCommand}
                disabled={running}
                className="inline-flex min-h-14 items-center justify-center gap-2 border border-emerald-200/30 bg-emerald-300 px-5 text-sm font-black uppercase tracking-[0.14em] text-slate-950 transition hover:bg-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              >
                <Play size={17} />
                {running ? 'Routing' : 'Run'}
              </button>
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {quickCommands.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    const next = chooseWorkerForCommand(item);
                    setCommand(item);
                    setSelectedId(next.id);
                    setManualSelection(false);
                    setRanCommand(false);
                    setCommandResult(null);
                  }}
                  className="shrink-0 border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-200 transition hover:border-cyan-200/40 hover:bg-cyan-200/10 hover:text-white"
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="mt-3 grid gap-2 border-t border-white/10 pt-3 sm:grid-cols-[auto_1fr] sm:items-center">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                Delivery
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
                    className={`min-h-9 border-r border-white/10 px-2 text-[10px] font-black uppercase tracking-[0.12em] transition last:border-r-0 ${
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
          </div>

          <section className="mt-4 border border-cyan-200/20 bg-cyan-300/[0.06] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-100">
                  <BookOpen size={15} />
                  TAH Fact of the Day
                </div>
                {dailyFact ? (
                  <>
                    <p className="mt-2 text-sm leading-6 text-slate-200">{dailyFact.blurb}</p>
                    <div className="mt-3 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">
                      <span>{dailyFact.title}</span>
                      {dailyFact.source && <span>{dailyFact.source}</span>}
                      <span>Shard {dailyFact.shardIndex}</span>
                      <span>{dailyFact.archive.shardCount} total shards</span>
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {factError || (factBusy ? 'Reading today\'s TAH shard...' : 'TAH fact waiting for the archive.')}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => loadDailyFact(true)}
                disabled={factBusy}
                className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 border border-cyan-200/30 px-3 text-xs font-black uppercase tracking-[0.14em] text-cyan-100 transition hover:bg-cyan-200 hover:text-slate-950 disabled:opacity-50"
              >
                <RefreshCw size={14} className={factBusy ? 'animate-spin' : ''} />
                Shuffle
              </button>
            </div>
          </section>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {intelligenceWorkers.map((worker) => (
              <WorkerTile
                key={worker.id}
                worker={worker}
                selected={worker.id === selected.id}
                recommended={worker.id === recommended.id}
                onSelect={() => {
                  setSelectedId(worker.id);
                  setManualSelection(true);
                  setRanCommand(false);
                  setCommandResult(null);
                }}
              />
            ))}
          </div>

          <div className="mt-4 grid gap-3 border border-white/10 bg-[#0d1c27] p-3 md:grid-cols-4">
            {teamSlots.map((slot) => {
              const SlotIcon = slot.icon;
              return (
                <div key={slot.label} className="min-h-20 border border-white/10 bg-black/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{slot.label}</span>
                    <SlotIcon size={16} className="text-cyan-100" />
                  </div>
                  <p className="mt-3 truncate text-sm font-black text-white">{slot.value}</p>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="border border-white/10 bg-[#0d1c27] shadow-2xl shadow-black/25">
          <div className={`border-b border-white/10 p-4 ${accent.tile}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-xs font-black uppercase tracking-[0.18em] ${accent.text}`}>{selected.slot} Worker</p>
                <h2 className="mt-2 text-2xl font-black uppercase leading-tight text-white">{selected.name}</h2>
              </div>
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center ${accent.icon}`}>
                <selected.icon size={28} />
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-200">{selected.role}</p>
          </div>

          <div className="space-y-5 p-4">
            <section>
              <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                <Gauge size={15} />
                Worker Stats
              </div>
              <div className="space-y-3">
                {(Object.keys(selected.stats) as WorkerStatKey[]).map((key) => (
                  <StatBar key={key} label={statLabels[key]} value={selected.stats[key]} color={accent.meter} />
                ))}
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                <Layers3 size={15} />
                TAH Loadout
              </div>
              <div className="space-y-2">
                {selected.tahLoadout.map((file) => (
                  <div key={file} className="flex items-center justify-between gap-3 border border-white/10 bg-black/20 px-3 py-2">
                    <span className="truncate font-mono text-xs text-cyan-100">{file}</span>
                    <Check size={15} className="shrink-0 text-emerald-200" />
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                <Bot size={15} />
                Model
              </div>
              <div className="border border-white/10 bg-black/20 px-3 py-3">
                <p className="text-sm font-bold text-white">{selected.model}</p>
                <p className="mt-1 text-xs text-slate-400">Small model lane with TAH context gating</p>
              </div>
            </section>

            <section className="border border-white/10 bg-black/20 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                  <TerminalSquare size={15} />
                  Developer Tools
                </div>
                <Link
                  href="/admin/orchestrator"
                  className="inline-flex items-center gap-1 border border-cyan-200/30 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100 transition hover:bg-cyan-200 hover:text-slate-950"
                >
                  Command Post
                  <ExternalLink size={12} />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <DevMetric label="Old Route" value={commandResult?.trace.commandPost?.status || 'standby'} />
                <DevMetric label="Queue" value={String(commandResult?.trace.commandPost?.pendingTerminalIntentCount ?? 0)} />
                <DevMetric
                  label="Master"
                  value={commandResult?.trace.commandPost?.masterArchive?.status || 'pending'}
                />
                <DevMetric
                  label="Shards"
                  value={String(commandResult?.trace.commandPost?.masterArchive?.shardCount ?? commandResult?.trace.atlasDiagnostics?.totalSegments ?? 0)}
                />
                <DevMetric
                  label="Policy"
                  value={commandResult?.trace.retrievalPolicy ? 'active' : 'standby'}
                />
                <DevMetric
                  label="Links"
                  value={String(commandResult?.trace.atlasDiagnostics?.linkedExperts ?? 0)}
                />
                <DevMetric
                  label="Memory"
                  value={commandResult?.trace.queryMemory?.status || 'standby'}
                />
                <DevMetric
                  label="Recalled"
                  value={String(commandResult?.trace.queryMemory?.recalled ?? 0)}
                />
              </div>
              <p className="mt-3 break-all font-mono text-[10px] text-slate-500">
                {commandResult?.trace.commandPost?.endpoint || '/api/admin/orchestrator/command'}
              </p>
              {commandResult?.trace.commandPost?.statusProbe && (
                <div className="mt-3 border border-white/10 bg-[#071016] p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">Status Probe</p>
                    <span className="font-mono text-[10px] text-slate-500">{commandResult.trace.commandPost.statusProbe.action}</span>
                  </div>
                  <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs leading-5 text-slate-300">
                    {commandResult.trace.commandPost.statusProbe.reply}
                  </p>
                </div>
              )}
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                  <ShieldCheck size={15} />
                  Supervisor
                </div>
                <button
                  type="button"
                  onClick={() => setSupervisorEnabled((value) => !value)}
                  className={`inline-flex h-8 w-14 items-center border p-1 transition ${
                    supervisorEnabled ? 'border-violet-200/40 bg-violet-300/20' : 'border-white/10 bg-black/20'
                  }`}
                  aria-label="Toggle supervisor check"
                  aria-pressed={supervisorEnabled}
                >
                  <span
                    className={`block h-5 w-5 bg-white transition ${supervisorEnabled ? 'translate-x-6' : 'translate-x-0'}`}
                  />
                </button>
              </div>
            </section>

            <section className="border border-white/10 bg-black/20 p-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                <Activity size={15} />
                Command Output
              </div>
              <h3 className="mt-3 text-base font-black text-white">
                {commandResult?.result.title || (ranCommand ? recommended.sampleOutput.title : selected.sampleOutput.title)}
              </h3>
              {commandResult?.result.summary && (
                <p className="mt-2 text-sm leading-6 text-slate-300">{commandResult.result.summary}</p>
              )}
              <div className="mt-3 space-y-2">
                {(commandResult?.result.actions || (ranCommand ? recommended.sampleOutput.bullets : selected.sampleOutput.bullets)).map((bullet) => (
                  <div key={bullet} className="flex gap-2 text-sm leading-5 text-slate-300">
                    <ChevronRight size={15} className="mt-0.5 shrink-0 text-cyan-200" />
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>
              {commandResult && (
                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Confidence</p>
                    <p className="mt-1 font-mono text-lg font-black text-white">{commandResult.result.confidence}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Route</p>
                    <p className="mt-1 font-mono text-lg font-black text-white">{commandResult.trace.routeMode}</p>
                  </div>
                </div>
              )}
              {commandError && (
                <p className="mt-3 border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-sm font-bold text-rose-100">
                  {commandError}
                </p>
              )}
            </section>

            {commandResult?.result.relayPlan ? (
              <section className="border border-amber-200/20 bg-amber-300/10 p-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-amber-100">
                  <BookOpen size={15} />
                  TAH Relay Template
                </div>
                <div className="mt-3 border border-white/10 bg-[#071016] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-base font-black text-white">{commandResult.result.relayPlan.templateName}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-300">{commandResult.result.relayPlan.purpose}</p>
                    </div>
                    <span className="shrink-0 border border-amber-200/30 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-amber-100">
                      {commandResult.result.relayPlan.templateId}
                    </span>
                  </div>
                  <div className="mt-3 border-t border-white/10 pt-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Format</p>
                    <p className="mt-1 text-sm font-bold text-white">{commandResult.result.relayPlan.format.name}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-300">{commandResult.result.relayPlan.format.useWhen}</p>
                    <div className="mt-2 grid gap-2 border-b border-white/10 pb-3 md:grid-cols-2">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Rhythm</p>
                        <p className="mt-1 text-xs leading-5 text-slate-200">{commandResult.result.relayPlan.format.rhythm}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Direction</p>
                        <p className="mt-1 text-xs leading-5 text-slate-200">{commandResult.result.relayPlan.format.visualDirection}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 border-t border-white/10 pt-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Visual</p>
                    <p className="mt-1 text-sm font-bold text-white">{commandResult.result.relayPlan.visual.motif}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-300">{commandResult.result.relayPlan.visual.layout}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {commandResult.result.relayPlan.visual.cues.map((cue) => (
                        <span key={cue} className="border border-amber-200/20 bg-amber-200/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-amber-100">
                          {cue}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid gap-2">
                  {commandResult.result.relayPlan.sections.slice(0, 4).map((section) => (
                    <div key={section.label} className="border border-white/10 bg-[#071016] px-3 py-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-100">{section.label}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-300">{section.instruction}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 border border-white/10 bg-[#071016] p-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Output Contract</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {commandResult.result.relayPlan.format.outputContract.map((item) => (
                      <span key={item} className="border border-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-300">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-3 border border-emerald-200/20 bg-emerald-300/10 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100">
                        {commandResult.result.relayPlan.finalScreen.frameLabel}
                      </p>
                      <p className="mt-1 text-sm font-black text-white">{commandResult.result.relayPlan.finalScreen.title}</p>
                    </div>
                    <BookOpen size={16} className="shrink-0 text-emerald-100" />
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-300">{commandResult.result.relayPlan.finalScreen.instruction}</p>
                  <div className="mt-3 space-y-2">
                    {commandResult.result.relayPlan.finalScreen.sourceCards.slice(0, 3).map((card) => (
                      <div key={`${card.source}-${card.matchReason}`} className="border border-white/10 bg-[#071016] px-2 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate font-mono text-[10px] font-black text-emerald-100">{card.source}</p>
                          <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">{card.matchReason}</span>
                        </div>
                        <p className="mt-1 truncate text-[10px] text-slate-400">{card.concepts.join(', ')}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 space-y-1">
                    {commandResult.result.relayPlan.finalScreen.learned.map((item) => (
                      <p key={item} className="text-xs leading-5 text-slate-200">{item}</p>
                    ))}
                  </div>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <div className="border border-white/10 bg-[#071016] p-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Words</p>
                    <p className="mt-1 text-xs leading-5 text-slate-200">{commandResult.result.relayPlan.words.voice}</p>
                  </div>
                  <div className="border border-white/10 bg-[#071016] p-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Avoid</p>
                    <p className="mt-1 text-xs leading-5 text-slate-200">{commandResult.result.relayPlan.words.avoid.slice(0, 2).join(', ')}</p>
                  </div>
                </div>
              </section>
            ) : null}

            {commandResult?.trace.selectedShards.length ? (
              <section className="border border-white/10 bg-black/20 p-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                  <Layers3 size={15} />
                  Retrieved TAH Context
                </div>
                <div className="mt-3 space-y-2">
                  {commandResult.trace.selectedShards.slice(0, 3).map((shard) => (
                    <div key={`${shard.expertId}-${shard.source}`} className="border border-white/10 bg-[#071016] p-2">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-xs font-black text-cyan-100">{shard.title}</p>
                        <span className="font-mono text-[10px] text-slate-500">{shard.score}</span>
                      </div>
                      <p className="mt-1 font-mono text-[10px] text-slate-500">{shard.source}</p>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-300">{shard.excerpt}</p>
                      {shard.metrics && (
                        <div className="mt-2 flex flex-wrap gap-1 font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">
                          <span>{shard.metrics.contextLevel}</span>
                          <span>{shard.metrics.matchReason}</span>
                          <span>D {shard.metrics.density}</span>
                          <span>V {shard.metrics.vitality}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {commandResult.trace.atlasDiagnostics && (
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">
                    Segments {commandResult.trace.atlasDiagnostics.visitedSegments}/{commandResult.trace.atlasDiagnostics.totalSegments}
                    {' '}Payload reads {commandResult.trace.atlasDiagnostics.payloadReads}
                    {' '}Links {commandResult.trace.atlasDiagnostics.linkedExperts || 0}
                  </p>
                )}
              </section>
            ) : null}

            {commandResult?.trace.retrievalPolicy ? (
              <section className="border border-cyan-200/20 bg-cyan-300/10 p-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
                  <Layers3 size={15} />
                  TAH Retrieval Policy
                </div>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-400">
                  Complexity {commandResult.trace.retrievalPolicy.targetComplexity}
                  {' '}Mode {commandResult.trace.retrievalPolicy.contextMode}
                  {' '}Synonyms {commandResult.trace.retrievalPolicy.synonymTerms}
                </p>
                <div className="mt-3 space-y-2">
                  {commandResult.trace.retrievalPolicy.stages.map((stage) => (
                    <div key={stage.name} className="border border-white/10 bg-[#071016] px-2 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100">{stage.name}</p>
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
              </section>
            ) : null}

            {commandResult?.trace.queryMemory ? (
              <section className="border border-emerald-200/20 bg-emerald-300/10 p-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-100">
                  <BookOpen size={15} />
                  Local Query Memory
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <DevMetric label="Status" value={commandResult.trace.queryMemory.status} />
                  <DevMetric label="Saved" value={commandResult.trace.queryMemory.saved ? 'yes' : 'no'} />
                  <DevMetric label="Recalled" value={String(commandResult.trace.queryMemory.recalled)} />
                </div>
                <p className="mt-3 break-all font-mono text-[10px] text-slate-400">{commandResult.trace.queryMemory.path}</p>
                {commandResult.trace.queryMemory.reason && (
                  <p className="mt-2 text-xs leading-5 text-slate-300">{commandResult.trace.queryMemory.reason}</p>
                )}
              </section>
            ) : null}

            {commandResult?.trace.supervisorNotes?.length ? (
              <section className="border border-violet-200/20 bg-violet-300/10 p-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-violet-100">
                  <ShieldCheck size={15} />
                  Supervisor Notes
                </div>
                <div className="mt-3 space-y-2">
                  {commandResult.trace.supervisorNotes.map((note) => (
                    <p key={note} className="text-xs leading-5 text-slate-200">{note}</p>
                  ))}
                </div>
             </section>
            ) : null}
          </div>
        </aside>
      </div>
    </section>
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

function DevMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 bg-[#071016] px-2 py-2">
      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 truncate font-mono text-xs font-black text-white">{value}</p>
    </div>
  );
}

function WorkerTile({
  worker,
  selected,
  recommended,
  onSelect
}: {
  worker: IntelligenceWorker;
  selected: boolean;
  recommended: boolean;
  onSelect: () => void;
}) {
  const Icon = worker.icon;
  const accent = accentClasses[worker.accent];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative h-[190px] border p-3 text-left shadow-lg transition hover:-translate-y-0.5 hover:border-white/25 focus:outline-none focus:ring-2 ${
        accent.tile
      } ${selected ? `ring-2 ${accent.selected}` : 'ring-0 ring-transparent'}`}
      aria-pressed={selected}
    >
      {recommended && (
        <div className="absolute right-2 top-2 flex items-center gap-1 border border-emerald-200/30 bg-emerald-300 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-950">
          <Zap size={12} />
          Pick
        </div>
      )}

      <div className={`flex h-12 w-12 items-center justify-center ${accent.icon}`}>
        <Icon size={25} />
      </div>

      <div className="mt-3 min-w-0">
        <h3 className="truncate text-base font-black uppercase leading-tight text-white">{worker.name}</h3>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-300">{worker.role}</p>
      </div>

      <div className="absolute bottom-3 left-3 right-3">
        <div className="flex items-center justify-between gap-2">
          <span className={`truncate text-[10px] font-black uppercase tracking-[0.14em] ${accent.text}`}>{worker.status}</span>
          <span className="font-mono text-[10px] font-bold text-slate-500">{worker.shortName}</span>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-1">
          {(Object.keys(worker.stats) as WorkerStatKey[]).map((key) => (
            <div key={key} className="h-1.5 bg-black/35">
              <div className={`h-full ${accent.meter}`} style={{ width: `${worker.stats[key]}%` }} />
            </div>
          ))}
        </div>
      </div>
    </button>
  );
}

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="text-xs font-bold text-slate-300">{label}</span>
        <span className="font-mono text-xs font-black text-white">{value}</span>
      </div>
      <div className="h-2 bg-black/35">
        <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
