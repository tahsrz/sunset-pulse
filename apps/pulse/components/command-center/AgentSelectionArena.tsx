'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  BookOpen,
  Bot,
  Check,
  ChevronRight,
  Command,
  Copy,
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
  precision: 'Accuracy',
  contextFit: 'File Fit'
};

const relayModeOptions: Array<{ mode: RelayMode; label: string }> = [
  { mode: 'briefing', label: 'Brief' },
  { mode: 'slideshow', label: 'Slides' },
  { mode: 'puppetshow', label: 'Story' },
  { mode: 'field-board', label: 'Map' },
  { mode: 'script', label: 'Script' }
];

const defaultCommand = 'Tell me who to call first this morning';

const claudecraftAssets = {
  arena: '/claudecraft/arena-poster.jpg',
  badges: [
    '/claudecraft/ui/emote-question.png',
    '/claudecraft/ui/emote-point.png',
    '/claudecraft/ui/emote-salute.png',
    '/claudecraft/ui/emote-cheer.png'
  ],
  glyphs: [
    '/claudecraft/vfx/magic-node.png',
    '/claudecraft/vfx/light-burst.png',
    '/claudecraft/vfx/spark.png',
    '/claudecraft/vfx/circle.png'
  ]
};

function assetIndexForId(id: string, count: number) {
  return id.split('').reduce((sum, character) => sum + character.charCodeAt(0), 0) % count;
}

function badgeForWorker(worker: IntelligenceWorker) {
  return claudecraftAssets.badges[assetIndexForId(worker.id, claudecraftAssets.badges.length)];
}

function glyphForWorker(worker: IntelligenceWorker) {
  return claudecraftAssets.glyphs[assetIndexForId(worker.id, claudecraftAssets.glyphs.length)];
}

export default function AgentSelectionArena() {
  const { logProtocol } = useTheme();
  const commandInputTouched = useRef(false);
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
  const voiceWorker = intelligenceWorkers.find((worker) => worker.id === 'agent-voice')!;
  const supervisorWorker = intelligenceWorkers.find((worker) => worker.id === 'supervisor')!;
  const accent = accentClasses[selected.accent];
  const tahLoadoutCount = new Set(intelligenceWorkers.flatMap((worker) => worker.tahLoadout)).size;

  const teamSlots = [
    { label: 'Picker', value: manualSelection ? 'You chose' : 'Auto chose', icon: Command },
    { label: 'Helper', value: selected.name, icon: selected.icon },
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

  useEffect(() => {
    const initialCommand = new URLSearchParams(window.location.search).get('command');
    if (!initialCommand) return;
    if (commandInputTouched.current) return;

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

  const updateCommandDraft = (nextCommand: string) => {
    commandInputTouched.current = true;
    const nextWorker = chooseWorkerForCommand(nextCommand);
    setCommand(nextCommand);
    setLinkedCommand('');
    setSelectedId(nextWorker.id);
    setManualSelection(false);
    setRanCommand(false);
    setCommandResult(null);
    setCommandError(null);
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
    <section className="relative min-h-screen overflow-hidden bg-[#071016] text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[440px] overflow-hidden opacity-45">
        <img
          src={claudecraftAssets.arena}
          alt=""
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#071016]/45 via-[#071016]/88 to-[#071016]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#071016] via-[#071016]/25 to-[#071016]" />
      </div>

      <div className="relative z-10 border-b border-white/10 bg-[#0b1821]/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 lg:flex-row lg:items-end lg:justify-between lg:px-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-100">
              <Cpu size={16} />
              Your Market Desk
            </div>
            <h1 className="mt-2 text-3xl font-black uppercase leading-tight text-white md:text-5xl">
              Choose a Helper
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Ask a focused helper to use your saved market notes, TAH files, and local context.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-right sm:min-w-[420px]">
            <Metric label="Helpers" value={String(intelligenceWorkers.length)} />
            <Metric label="Files" value={String(tahLoadoutCount)} />
            <Metric label="Matching" value="Auto" />
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto grid max-w-7xl gap-4 px-4 py-5 lg:grid-cols-[1fr_360px] lg:px-6">
        <div className="min-w-0">
          <div className="border border-white/10 bg-[#0d1c27] p-3 shadow-2xl shadow-black/20">
            <div className="flex flex-col gap-3 md:flex-row">
              <label className="relative flex min-h-14 flex-1 items-center border border-white/10 bg-black/25 px-3">
                <Search className="mr-3 shrink-0 text-cyan-200" size={19} />
                <input
                  value={command}
                  onChange={(event) => {
                    updateCommandDraft(event.target.value);
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
                {running ? 'Thinking' : 'Run'}
              </button>
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {quickCommands.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    updateCommandDraft(item);
                  }}
                  className="shrink-0 border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-200 transition hover:border-cyan-200/40 hover:bg-cyan-200/10 hover:text-white"
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="mt-3 grid gap-2 border-t border-white/10 pt-3 sm:grid-cols-[auto_1fr] sm:items-center">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                Answer Style
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
                  Today's TAH Note
                </div>
                {dailyFact ? (
                  <>
                    <p className="mt-2 text-sm leading-6 text-slate-200">{glossaryText(dailyFact.blurb)}</p>
                    <div className="mt-3 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">
                      <span>{dailyFact.title}</span>
                      {dailyFact.source && <span>{dailyFact.source}</span>}
                      <span>Note {dailyFact.shardIndex}</span>
                      <span>{dailyFact.archive.shardCount} notes available</span>
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {factError || (factBusy ? 'Reading today\'s TAH note...' : 'TAH note waiting for the archive.')}
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

          <section className="relative mt-4 min-h-[170px] overflow-hidden border border-white/10 bg-[#0d1c27]">
            <img
              src={claudecraftAssets.arena}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-center opacity-55"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#071016] via-[#071016]/70 to-[#071016]/35" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#071016]/80 via-transparent to-[#071016]/30" />

            <div className="relative grid gap-4 p-4 md:grid-cols-[1fr_320px] md:items-end">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-amber-100">
                  <Zap size={15} />
                  Current Helper
                </div>
                <h2 className="mt-2 max-w-2xl text-2xl font-black uppercase leading-tight text-white md:text-4xl">
                  {selected.name}
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-200">{selected.role}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {teamSlots.map((slot) => {
                  const SlotIcon = slot.icon;
                  return (
                    <div key={slot.label} className="min-h-16 border border-white/10 bg-black/45 p-2 backdrop-blur">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">{slot.label}</span>
                        <SlotIcon size={14} className="text-amber-100" />
                      </div>
                      <p className="mt-2 truncate text-xs font-black text-white">{slot.value}</p>
                    </div>
                  );
                })}
              </div>
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
        </div>

        <aside className="border border-white/10 bg-[#0d1c27] shadow-2xl shadow-black/25">
          <div className={`border-b border-white/10 p-4 ${accent.tile}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-xs font-black uppercase tracking-[0.18em] ${accent.text}`}>{selected.slot} Helper</p>
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
                How This Helper Works
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
                Files It Reads
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
                AI Model
              </div>
              <div className="border border-white/10 bg-black/20 px-3 py-3">
                <p className="text-sm font-bold text-white">{selected.model}</p>
                <p className="mt-1 text-xs text-slate-400">Uses a small model with the right TAH files attached.</p>
              </div>
            </section>

            <section className="border border-white/10 bg-black/20 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                  <TerminalSquare size={15} />
                  System Tools
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
                <DevMetric label="Command Post" value={commandResult?.trace.commandPost?.status || 'standby'} />
                <DevMetric label="Waiting" value={String(commandResult?.trace.commandPost?.pendingTerminalIntentCount ?? 0)} />
                <DevMetric
                  label="Archive"
                  value={commandResult?.trace.commandPost?.masterArchive?.status || 'pending'}
                />
                <DevMetric
                  label="Notes"
                  value={String(commandResult?.trace.commandPost?.masterArchive?.shardCount ?? commandResult?.trace.atlasDiagnostics?.totalSegments ?? 0)}
                />
                <DevMetric
                  label="Search"
                  value={commandResult?.trace.retrievalPolicy ? 'active' : 'standby'}
                />
                <DevMetric
                  label="Related"
                  value={String(commandResult?.trace.atlasDiagnostics?.linkedExperts ?? 0)}
                />
                <DevMetric
                  label="Saved"
                  value={commandResult?.trace.queryMemory?.status || 'standby'}
                />
                <DevMetric
                  label="Past Notes"
                  value={String(commandResult?.trace.queryMemory?.recalled ?? 0)}
                />
              </div>
              <p className="mt-3 break-all font-mono text-[10px] text-slate-500">
                {commandResult?.trace.commandPost?.endpoint || '/api/admin/orchestrator/command'}
              </p>
              {commandResult?.trace.commandPost?.statusProbe && (
                <div className="mt-3 border border-white/10 bg-[#071016] p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">System Check</p>
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
                  Safety Check
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
                Plain Answer
              </div>
              <h3 className="mt-3 text-base font-black text-white">
                {commandResult?.result.title ? glossaryText(commandResult.result.title) : (ranCommand ? recommended.sampleOutput.title : selected.sampleOutput.title)}
              </h3>
              {commandResult?.result.summary && (
                <p className="mt-2 text-sm leading-6 text-slate-300">{glossaryText(commandResult.result.summary)}</p>
              )}
              <div className="mt-3 space-y-2">
                {(commandResult?.result.actions || (ranCommand ? recommended.sampleOutput.bullets : selected.sampleOutput.bullets)).map((bullet) => (
                  <div key={bullet} className="flex gap-2 text-sm leading-5 text-slate-300">
                    <ChevronRight size={15} className="mt-0.5 shrink-0 text-cyan-200" />
                    <span>{glossaryText(bullet)}</span>
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
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Picked By</p>
                    <p className="mt-1 font-mono text-lg font-black text-white">{formatRouteMode(commandResult.trace.routeMode)}</p>
                  </div>
                </div>
              )}
              {commandError && (
                <p className="mt-3 border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-sm font-bold text-rose-100">
                  {commandError}
                </p>
              )}
            </section>

            {commandResult?.result.civicRecord ? (
              <ParsedRecordCard record={commandResult.result.civicRecord} />
            ) : null}

            {commandResult?.result.actionItems?.length ? (
              <CommandActionPanel
                actions={commandResult.result.actionItems}
                copiedActionId={copiedActionId}
                saved={Boolean(commandResult.trace.queryMemory?.saved)}
                onAction={handleActionItem}
              />
            ) : null}

            {commandResult?.result.deliverable ? (
              <section className="border border-emerald-200/20 bg-emerald-300/10 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-100">
                      <BookOpen size={15} />
                      What I Did
                    </div>
                    <h3 className="mt-2 text-base font-black text-white">{glossaryText(commandResult.result.deliverable.title)}</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-300">{glossaryText(commandResult.result.deliverable.sourceSummary)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="border border-emerald-200/30 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-100">
                      {commandResult.result.deliverable.mode}
                    </span>
                    <button
                      type="button"
                      onClick={copyDeliverable}
                      className="inline-flex h-8 items-center gap-2 border border-emerald-200/40 px-2 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100 transition hover:bg-emerald-200 hover:text-slate-950"
                    >
                      {copiedDeliverable ? <Check size={13} /> : <Copy size={13} />}
                      {copiedDeliverable ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {commandResult.result.deliverable.frames.map((frame, index) => (
                    <div key={`${frame.label}-${frame.title}`} className="border border-white/10 bg-[#071016] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <img
                            src={claudecraftAssets.glyphs[index % claudecraftAssets.glyphs.length]}
                            alt=""
                            className="mt-0.5 h-10 w-10 shrink-0 rounded-full border border-emerald-200/20 bg-black/40 object-cover p-1"
                          />
                          <div className="min-w-0">
                            <p className="font-mono text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100">{frame.label}</p>
                            <p className="mt-1 text-sm font-black text-white">{glossaryText(frame.title)}</p>
                          </div>
                        </div>
                        <Check size={15} className="shrink-0 text-emerald-100" />
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-200">{glossaryText(frame.body)}</p>
                      <div className="mt-3 border-t border-white/10 pt-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Visual Idea</p>
                        <p className="mt-1 text-xs leading-5 text-slate-300">{glossaryText(frame.visualDirection)}</p>
                      </div>
                      <div className="mt-2 border-t border-white/10 pt-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Talking Note</p>
                        <p className="mt-1 text-xs leading-5 text-slate-300">{glossaryText(frame.speakerNote)}</p>
                      </div>
                      <p className="mt-2 truncate font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">{frame.sourceAnchor}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {commandResult?.result.relayPlan ? (
              <section className="border border-amber-200/20 bg-amber-300/10 p-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-amber-100">
                  <BookOpen size={15} />
                  Behind The Scenes
                </div>
                <div className="mt-3 border border-white/10 bg-[#071016] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-base font-black text-white">{commandResult.result.relayPlan.templateName}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-300">{glossaryText(commandResult.result.relayPlan.purpose)}</p>
                    </div>
                    <span className="shrink-0 border border-amber-200/30 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-100">
                      {formatRelayMode(commandResult.result.relayPlan.mode)}
                    </span>
                  </div>
                  <div className="mt-3 border-t border-white/10 pt-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Style</p>
                    <p className="mt-1 text-sm font-bold text-white">{commandResult.result.relayPlan.format.name}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-300">{glossaryText(commandResult.result.relayPlan.format.useWhen)}</p>
                    <div className="mt-2 grid gap-2 border-b border-white/10 pb-3 md:grid-cols-2">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Flow</p>
                        <p className="mt-1 text-xs leading-5 text-slate-200">{glossaryText(commandResult.result.relayPlan.format.rhythm)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Visual Style</p>
                        <p className="mt-1 text-xs leading-5 text-slate-200">{glossaryText(commandResult.result.relayPlan.format.visualDirection)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 border-t border-white/10 pt-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Look</p>
                    <p className="mt-1 text-sm font-bold text-white">{commandResult.result.relayPlan.visual.motif}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-300">{glossaryText(commandResult.result.relayPlan.visual.layout)}</p>
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
                      <p className="mt-1 text-xs leading-5 text-slate-300">{glossaryText(section.instruction)}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 border border-white/10 bg-[#071016] p-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">What It Includes</p>
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
                      <p className="mt-1 text-sm font-black text-white">{glossaryText(commandResult.result.relayPlan.finalScreen.title)}</p>
                    </div>
                    <BookOpen size={16} className="shrink-0 text-emerald-100" />
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-300">{glossaryText(commandResult.result.relayPlan.finalScreen.instruction)}</p>
                  <div className="mt-3 space-y-2">
                    {commandResult.result.relayPlan.finalScreen.sourceCards.slice(0, 3).map((card, index) => (
                      <div key={`${card.source}-${card.matchReason}-${index}`} className="border border-white/10 bg-[#071016] px-2 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate font-mono text-[10px] font-black text-emerald-100">{card.source}</p>
                          <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500">{formatMatchReason(card.matchReason)}</span>
                        </div>
                        <p className="mt-1 truncate text-[10px] text-slate-400">{card.concepts.join(', ')}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 space-y-1">
                    {commandResult.result.relayPlan.finalScreen.learned.map((item) => (
                      <p key={item} className="text-xs leading-5 text-slate-200">{glossaryText(item)}</p>
                    ))}
                  </div>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <div className="border border-white/10 bg-[#071016] p-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Tone</p>
                    <p className="mt-1 text-xs leading-5 text-slate-200">{glossaryText(commandResult.result.relayPlan.words.voice)}</p>
                  </div>
                  <div className="border border-white/10 bg-[#071016] p-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Avoids</p>
                    <p className="mt-1 text-xs leading-5 text-slate-200">{glossaryText(commandResult.result.relayPlan.words.avoid.slice(0, 2).join(', '))}</p>
                  </div>
                </div>
              </section>
            ) : null}

            {commandResult?.trace.selectedShards.length ? (
              <section className="border border-white/10 bg-black/20 p-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                  <Layers3 size={15} />
                  Sources Checked
                </div>
                <div className="mt-3 space-y-2">
                  {commandResult.trace.selectedShards.slice(0, 3).map((shard) => (
                    <div key={`${shard.expertId}-${shard.source}`} className="border border-white/10 bg-[#071016] p-2">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-xs font-black text-cyan-100">{shard.title}</p>
                        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">match {formatMatchScore(shard.score)}</span>
                      </div>
                      <p className="mt-1 font-mono text-[10px] text-slate-500">{shard.source}</p>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-300">{glossaryText(shard.excerpt)}</p>
                      {shard.metrics && (
                        <div className="mt-2 flex flex-wrap gap-1 text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500">
                          <span>{formatContextLevel(shard.metrics.contextLevel)}</span>
                          <span>{formatMatchReason(shard.metrics.matchReason)}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {commandResult.trace.atlasDiagnostics && (
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">
                    Checked {commandResult.trace.atlasDiagnostics.visitedSegments}/{commandResult.trace.atlasDiagnostics.totalSegments}
                    {' '}Opened {commandResult.trace.atlasDiagnostics.payloadReads}
                    {' '}Related {commandResult.trace.atlasDiagnostics.linkedExperts || 0}
                  </p>
                )}
              </section>
            ) : null}

            {commandResult?.trace.retrievalPolicy ? (
              <section className="border border-cyan-200/20 bg-cyan-300/10 p-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
                  <Layers3 size={15} />
                  How Files Were Chosen
                </div>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-400">
                  Detail {formatDetailLevel(commandResult.trace.retrievalPolicy.targetComplexity)}
                  {' '}View quick
                  {' '}Related words {commandResult.trace.retrievalPolicy.synonymTerms}
                </p>
                <div className="mt-3 space-y-2">
                  {commandResult.trace.retrievalPolicy.stages.map((stage) => (
                    <div key={stage.name} className="border border-white/10 bg-[#071016] px-2 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100">{formatSearchStage(stage.name)}</p>
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
                  Saved For Later
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <DevMetric label="Status" value={commandResult.trace.queryMemory.status} />
                  <DevMetric label="Saved" value={commandResult.trace.queryMemory.saved ? 'yes' : 'no'} />
                  <DevMetric label="Past Notes" value={String(commandResult.trace.queryMemory.recalled)} />
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
                  Safety Check Notes
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

function formatRouteMode(mode: 'auto' | 'manual') {
  return mode === 'manual' ? 'you' : 'auto';
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

function formatMatchReason(reason: string) {
  const normalized = reason.toLowerCase();
  if (normalized.includes('query memory')) return 'saved note';
  if (normalized.includes('virtual') || normalized.includes('loadout')) return 'helper file';
  if (normalized.includes('concept')) return 'word match';
  if (normalized.includes('policy')) return 'search match';
  if (normalized.includes('retrieved')) return 'file match';
  return reason.replace(/[_-]+/g, ' ');
}

function formatContextLevel(level: 'summary' | 'interface' | 'full') {
  if (level === 'full') return 'full note';
  if (level === 'interface') return 'focused note';
  return 'quick note';
}

function formatMatchScore(score: number) {
  if (score >= 100) return 'high';
  if (score >= 60) return 'good';
  return 'light';
}

function formatDetailLevel(value: number) {
  if (value >= 0.75) return 'deep';
  if (value >= 0.45) return 'medium';
  return 'quick';
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
  const badge = badgeForWorker(worker);
  const glyph = glyphForWorker(worker);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative h-[206px] overflow-hidden border p-3 text-left shadow-lg transition hover:-translate-y-0.5 hover:border-white/25 focus:outline-none focus:ring-2 ${
        accent.tile
      } ${selected ? `ring-2 ${accent.selected}` : 'ring-0 ring-transparent'}`}
      aria-pressed={selected}
    >
      <img
        src={glyph}
        alt=""
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 opacity-20 blur-[1px] transition group-hover:opacity-35"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 to-transparent" />

      {recommended && (
        <div className="absolute right-2 top-2 flex items-center gap-1 border border-emerald-200/30 bg-emerald-300 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-950">
          <Zap size={12} />
          Pick
        </div>
      )}

      <div className="relative flex items-center gap-2">
        <div className={`flex h-12 w-12 items-center justify-center ${accent.icon}`}>
          <Icon size={25} />
        </div>
        <img
          src={badge}
          alt=""
          className="h-11 w-11 shrink-0 rounded-full border border-white/10 bg-black/35 object-cover p-1 shadow-lg shadow-black/30"
        />
      </div>

      <div className="relative mt-3 min-w-0">
        <h3 className="truncate text-base font-black uppercase leading-tight text-white">{worker.name}</h3>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-300">{worker.role}</p>
      </div>

      <div className="absolute bottom-3 left-3 right-3 z-10">
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
