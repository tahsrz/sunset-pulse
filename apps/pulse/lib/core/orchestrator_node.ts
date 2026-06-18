import { execFileSync } from 'child_process';
import { getTahMasterMetadata, listTahMasterPlaces, searchTahMaster } from './tah_master';
import type { OperatorAccess } from './operator_access';
import { getOrchestratorQueueSnapshot, type TerminalIntent } from './orchestrator_command_queue';
import { getMlsSyncSnapshot, type MlsSyncRun } from '@/lib/data/mlsSyncLedger';

export type BridgeProcess = {
  pid: number;
  parentPid: number;
  name: string;
  commandLine: string;
};

export type BridgeProcessGroup = {
  id: string;
  rootPid: number;
  processCount: number;
  processNames: string[];
  commandHints: string[];
  processes: BridgeProcess[];
};

export type OrchestratorSnapshot = {
  generatedAt: string;
  access: OperatorAccess;
  telegram: {
    configured: boolean;
    operatorChatConfigured: boolean;
    commandPrefix: string;
    shellPrefix: string;
    webhookPath: string;
  };
  commandRouter: {
    modes: Array<{ mode: string; trigger: string; behavior: string }>;
    botFatherCommands: Array<{ command: string; description: string }>;
    terminalPolicy: string[];
  };
  modelNetwork: Array<{ id: string; role: string; configured: boolean; bestFor: string }>;
  toolGateway: Array<{ id: string; label: string; status: 'ready' | 'needs_config' | 'guarded'; detail: string }>;
  bridge: {
    note: string;
    groups: BridgeProcessGroup[];
  };
  masterArchive: OrchestratorMasterArchive;
  commandQueue: {
    pendingTerminalIntentCount: number;
    recentTerminalIntents: TerminalIntent[];
  };
  mlsSync: {
    latest: MlsSyncRun | null;
    latestCompleted: MlsSyncRun | null;
    runningCount: number;
    recentRuns: MlsSyncRun[];
  };
  browserChecks: Array<{ id: string; label: string; route: string; assertion: string }>;
};

export type OrchestratorMasterArchive = Omit<ReturnType<typeof getTahMasterMetadata>, 'sources' | 'skipped'> & {
  sourcePreviewCount: number;
  skippedPreviewCount: number;
  sourcePreview: Array<{
    slug: string;
    name: string;
    title: string;
    type: string;
    shardCount: number;
  }>;
  skippedPreview: any[];
};

export type OrchestratorBrowserCheck = {
  id: string;
  generatedAt: string;
  status: 'passed' | 'failed';
  steps: Array<{
    label: string;
    target: string;
    assertion: string;
    status: 'passed' | 'failed';
    detail: string;
  }>;
};

export function getOrchestratorSnapshot(access: OperatorAccess): OrchestratorSnapshot {
  const masterArchive = summarizeMasterArchive(getTahMasterMetadata());
  const mlsSync = getMlsSyncSnapshot();

  return {
    generatedAt: new Date().toISOString(),
    access,
    telegram: {
      configured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      operatorChatConfigured: Boolean(process.env.AUTHORIZED_USER_ID || process.env.TELEGRAM_OPERATOR_CHAT_ID),
      commandPrefix: '/',
      shellPrefix: '!',
      webhookPath: '/api/telegram/webhook'
    },
    commandRouter: {
      modes: [
        { mode: 'Assistant', trigger: 'plain text', behavior: 'Treat as an operator prompt or Jamie request.' },
        { mode: 'Bot command', trigger: '/command', behavior: 'Route to a known safe action.' },
        { mode: 'Terminal', trigger: '!command', behavior: 'Queue as guarded shell intent with risk checks.' }
      ],
      botFatherCommands: getBotFatherCommands(),
      terminalPolicy: [
        'Never infer shell mode from plain English.',
        'Require ! or /shell for terminal intent.',
        'Group parent and child bridge PIDs before reporting duplicate sessions.',
        'Require confirmation for destructive file, git reset, or deployment actions.',
        'Use /cancel to clear pending prompts, confirmations, or running jobs.'
      ]
    },
    modelNetwork: [
      { id: 'openai', role: 'planner / final response', configured: Boolean(process.env.OPENAI_API_KEY), bestFor: 'General orchestration, coding, summarization.' },
      { id: 'anthropic', role: 'reviewer', configured: Boolean(process.env.ANTHROPIC_API_KEY), bestFor: 'Risk review and long-context synthesis.' },
      { id: 'groq', role: 'fast responder', configured: Boolean(process.env.GROQ_API_KEY), bestFor: 'Low-latency classification and summaries.' },
      { id: 'openrouter', role: 'model router', configured: Boolean(process.env.OPENROUTER_API_KEY), bestFor: 'Provider-agnostic model dispatch.' },
      { id: 'local', role: 'offline fallback', configured: Boolean(process.env.OLLAMA_HOST || process.env.LOCAL_LLM_URL), bestFor: 'Private/offline utility tasks.' }
    ],
    toolGateway: [
      { id: 'tah-master', label: 'TAH Master Archive', status: masterArchive.status === 'ready' ? 'ready' : 'needs_config', detail: `${masterArchive.sourceCount} sources, ${masterArchive.shardCount} shards.` },
      { id: 'telegram', label: 'Telegram Bridge', status: process.env.TELEGRAM_BOT_TOKEN ? 'ready' : 'needs_config', detail: process.env.TELEGRAM_BOT_TOKEN ? 'Bot token configured.' : 'Set TELEGRAM_BOT_TOKEN.' },
      { id: 'shell', label: 'Terminal Gateway', status: 'guarded', detail: 'Available only through explicit command mode and safety checks.' },
      { id: 'browser-check', label: 'Browser Check Runner', status: 'ready', detail: 'Runs Playwright-style route assertions without shell execution.' },
      { id: 'atlas-places', label: 'Atlas Place Bindings', status: masterArchive.status === 'ready' ? 'ready' : 'needs_config', detail: 'Reads places from /api/tah/master/places.' },
      { id: 'mls-sync', label: 'MLS Sync Ledger', status: mlsSync.latest?.status === 'failed' ? 'guarded' : 'ready', detail: formatMlsSyncDetail(mlsSync.latest) }
    ],
    bridge: {
      note: 'A bridge may appear as a parent/child process pair. Group by ancestry, command line, cwd, port, and start time before reporting duplicates.',
      groups: inspectBridgeProcessGroups()
    },
    masterArchive,
    commandQueue: getOrchestratorQueueSnapshot(),
    mlsSync: {
      latest: mlsSync.latest,
      latestCompleted: mlsSync.latestCompleted,
      runningCount: mlsSync.runningCount,
      recentRuns: mlsSync.recentRuns
    },
    browserChecks: [
      { id: 'tah-master-ready', label: 'Master archive ready', route: '/api/tah/master', assertion: 'status === ready' },
      { id: 'master-search', label: 'Master search returns Atlas Pulse', route: '/api/tah/master/search?q=Atlas%20Pulse&limit=1', assertion: 'results.length > 0' },
      { id: 'places', label: 'Atlas places extract', route: '/api/tah/master/places?limit=5', assertion: 'places include physical anchors' }
    ]
  };
}

function formatMlsSyncDetail(run: MlsSyncRun | null) {
  if (!run) return 'No MLS sync runs recorded yet.';
  const { received, synced, skipped, failed } = run.metrics;
  return `${run.status}: ${synced}/${received} synced, ${skipped} skipped, ${failed} failed.`;
}

function summarizeMasterArchive(masterArchive: ReturnType<typeof getTahMasterMetadata>): OrchestratorMasterArchive {
  const { sources, skipped, ...summary } = masterArchive;

  return {
    ...summary,
    sourcePreviewCount: sources.length,
    skippedPreviewCount: skipped.length,
    sourcePreview: sources.slice(0, 8).map((source: any) => ({
      slug: source.slug,
      name: source.name,
      title: source.title,
      type: source.type,
      shardCount: source.shardCount
    })),
    skippedPreview: skipped.slice(0, 5)
  };
}

export function runOrchestratorBrowserCheck(): OrchestratorBrowserCheck {
  const steps: OrchestratorBrowserCheck['steps'] = [];
  const master = getTahMasterMetadata();

  steps.push({
    label: 'Open master archive metadata',
    target: '/api/tah/master',
    assertion: 'archive.status === ready',
    status: master.status === 'ready' ? 'passed' : 'failed',
    detail: `${master.sourceCount} sources, ${master.shardCount} shards`
  });

  let searchCount = 0;
  try {
    searchCount = searchTahMaster({ query: 'Atlas Pulse', limit: 1 }).count;
  } catch {
    searchCount = 0;
  }

  steps.push({
    label: 'Search master archive',
    target: '/api/tah/master/search?q=Atlas%20Pulse&limit=1',
    assertion: 'results.length > 0',
    status: searchCount > 0 ? 'passed' : 'failed',
    detail: `${searchCount} result${searchCount === 1 ? '' : 's'}`
  });

  let placeCount = 0;
  let coverageAverage = 0;
  try {
    const places = listTahMasterPlaces({ limit: 5 });
    placeCount = places.count;
    coverageAverage = places.coverageAverage;
  } catch {
    placeCount = 0;
  }

  steps.push({
    label: 'Extract Atlas places',
    target: '/api/tah/master/places?limit=5',
    assertion: 'places.length > 0',
    status: placeCount > 0 ? 'passed' : 'failed',
    detail: `${placeCount} places, ${coverageAverage}% average binding`
  });

  return {
    id: 'operator-control-room-smoke',
    generatedAt: new Date().toISOString(),
    status: steps.every(step => step.status === 'passed') ? 'passed' : 'failed',
    steps
  };
}

export function getBotFatherCommands() {
  return [
    { command: 'status', description: 'Show bridge and server status' },
    { command: 'sessions', description: 'Show grouped parent/child process sessions' },
    { command: 'commands', description: 'Show available command modes' },
    { command: 'cancel', description: 'Cancel pending command or prompt' },
    { command: 'tah', description: 'Search TAH memory' },
    { command: 'places', description: 'Show Atlas Pulse place bindings' },
    { command: 'check', description: 'Run central node browser-style checks' },
    { command: 'pack_master', description: 'Rebuild Atlas Pulse master archive' },
    { command: 'help', description: 'Show usage help' }
  ];
}

function inspectBridgeProcessGroups(): BridgeProcessGroup[] {
  const processes = readCandidateProcesses();
  const byPid = new Map(processes.map(process => [process.pid, process]));
  const visited = new Set<number>();
  const groups: BridgeProcessGroup[] = [];

  for (const process of processes) {
    if (visited.has(process.pid)) continue;
    const root = findGroupRoot(process, byPid);
    const children = processes.filter(candidate => belongsToRoot(candidate, root.pid, byPid));
    children.forEach(child => visited.add(child.pid));
    groups.push({
      id: `pid-${root.pid}`,
      rootPid: root.pid,
      processCount: children.length,
      processNames: [...new Set(children.map(child => child.name))],
      commandHints: [...new Set(children.map(child => compactCommand(child.commandLine)).filter(Boolean))].slice(0, 4),
      processes: children.sort((a, b) => a.pid - b.pid)
    });
  }

  return groups.sort((a, b) => b.processCount - a.processCount).slice(0, 8);
}

function readCandidateProcesses(): BridgeProcess[] {
  try {
    if (process.platform === 'win32') return readWindowsProcesses();
    return readUnixProcesses();
  } catch {
    return [];
  }
}

function readWindowsProcesses() {
  const script = [
    "try {",
    "  $items = Get-CimInstance Win32_Process -ErrorAction Stop | Where-Object { $_.CommandLine -match 'telegram|\\bbot\\b|\\bbridge\\b|next dev|npm run dev|3001|tsx|node' } | Select-Object ProcessId,ParentProcessId,Name,CommandLine",
    '  $items | ConvertTo-Json -Compress',
    "} catch {",
    "  '[]'",
    "}"
  ].join('; ');
  const output = execFileSync('powershell.exe', ['-NoProfile', '-Command', script], { encoding: 'utf8', timeout: 2500 });
  return normalizeProcessJson(output);
}

function readUnixProcesses() {
  const output = execFileSync('ps', ['-eo', 'pid=,ppid=,comm=,args='], { encoding: 'utf8', timeout: 2500 });
  return output
    .split('\n')
    .map(line => line.trim())
    .filter(line => /telegram|\bbot\b|\bbridge\b|next dev|npm run dev|3001|tsx|node/i.test(line))
    .map(line => {
      const match = line.match(/^(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/);
      if (!match) return null;
      return {
        pid: Number(match[1]),
        parentPid: Number(match[2]),
        name: match[3],
        commandLine: match[4]
      };
    })
    .filter(Boolean) as BridgeProcess[];
}

function normalizeProcessJson(output: string): BridgeProcess[] {
  if (!output.trim()) return [];
  const parsed = JSON.parse(output);
  const list = Array.isArray(parsed) ? parsed : [parsed];
  return list
    .map(item => ({
      pid: Number(item.ProcessId),
      parentPid: Number(item.ParentProcessId),
      name: String(item.Name || ''),
      commandLine: String(item.CommandLine || '')
    }))
    .filter(item => item.pid > 0);
}

function findGroupRoot(process: BridgeProcess, byPid: Map<number, BridgeProcess>): BridgeProcess {
  let current = process;
  const seen = new Set<number>();

  while (byPid.has(current.parentPid) && !seen.has(current.parentPid)) {
    seen.add(current.pid);
    current = byPid.get(current.parentPid)!;
  }

  return current;
}

function belongsToRoot(process: BridgeProcess, rootPid: number, byPid: Map<number, BridgeProcess>) {
  let current: BridgeProcess | undefined = process;
  const seen = new Set<number>();

  while (current && !seen.has(current.pid)) {
    if (current.pid === rootPid) return true;
    seen.add(current.pid);
    current = byPid.get(current.parentPid);
  }

  return false;
}

function compactCommand(commandLine: string) {
  return commandLine.replace(/\s+/g, ' ').trim().slice(0, 140);
}
