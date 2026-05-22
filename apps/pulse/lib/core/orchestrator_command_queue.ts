import fs from 'fs';
import path from 'path';

export type TerminalRiskLevel = 'low' | 'medium' | 'high';

export type TerminalIntent = {
  id: string;
  createdAt: string;
  updatedAt: string;
  source: 'console' | 'telegram';
  chatId: string | null;
  username: string | null;
  command: string;
  riskLevel: TerminalRiskLevel;
  reason: string;
  status: 'pending' | 'approved' | 'running' | 'completed' | 'failed' | 'cancelled' | 'rejected';
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  startedAt?: string;
  completedAt?: string;
  exitCode?: number | null;
  stdout?: string;
  stderr?: string;
  executionError?: string;
  cwd?: string;
};

type CommandQueueState = {
  terminalIntents: TerminalIntent[];
  persistencePath: string;
};

type ListTerminalIntentsInput = {
  status?: TerminalIntent['status'];
  chatId?: string | null;
  limit?: number;
};

type CancelTerminalIntentsInput = {
  chatId?: string | null;
  includeAll?: boolean;
};

const MAX_TERMINAL_INTENTS = 50;
const QUEUE_VERSION = 1;

export function enqueueTerminalIntent(input: Omit<TerminalIntent, 'id' | 'createdAt' | 'updatedAt' | 'status'>) {
  const state = getState();
  const now = new Date().toISOString();
  const intent: TerminalIntent = {
    ...input,
    id: createIntentId(),
    createdAt: now,
    updatedAt: now,
    status: 'pending'
  };

  state.terminalIntents.unshift(intent);
  state.terminalIntents = state.terminalIntents.slice(0, MAX_TERMINAL_INTENTS);
  persistState(state);
  return intent;
}

export function listTerminalIntents(input: ListTerminalIntentsInput = {}) {
  const limit = Math.max(1, Math.min(Number(input.limit || 10), MAX_TERMINAL_INTENTS));
  return getState().terminalIntents
    .filter(intent => !input.status || intent.status === input.status)
    .filter(intent => input.chatId === undefined || intent.chatId === input.chatId)
    .slice(0, limit);
}

export function getTerminalIntent(id: string) {
  return getState().terminalIntents.find(intent => intent.id === id) || null;
}

export function updateTerminalIntent(id: string, patch: Partial<TerminalIntent>) {
  const state = getState();
  let updated: TerminalIntent | null = null;

  state.terminalIntents = state.terminalIntents.map(intent => {
    if (intent.id !== id) return intent;
    updated = {
      ...intent,
      ...patch,
      updatedAt: new Date().toISOString()
    };
    return updated;
  });

  if (updated) persistState(state);
  return updated;
}

export function cancelTerminalIntents(input: CancelTerminalIntentsInput = {}) {
  let cancelled = 0;
  const state = getState();

  state.terminalIntents = state.terminalIntents.map(intent => {
    const chatMatches = input.includeAll || input.chatId === undefined || intent.chatId === input.chatId;
    if ((intent.status !== 'pending' && intent.status !== 'approved') || !chatMatches) return intent;
    cancelled += 1;
    return { ...intent, status: 'cancelled', updatedAt: new Date().toISOString() };
  });

  if (cancelled > 0) persistState(state);
  return cancelled;
}

export function getOrchestratorQueueSnapshot() {
  const pending = listTerminalIntents({ status: 'pending', limit: MAX_TERMINAL_INTENTS });
  const approved = listTerminalIntents({ status: 'approved', limit: MAX_TERMINAL_INTENTS });

  return {
    pendingTerminalIntentCount: pending.length + approved.length,
    recentTerminalIntents: listTerminalIntents({ limit: 8 })
  };
}

export function resetOrchestratorCommandQueueForTests() {
  const state = getState();
  state.terminalIntents = [];
  persistState(state);
}

export function reloadOrchestratorCommandQueueForTests() {
  const globalStore = globalThis as any;
  delete globalStore.__sunsetPulseOrchestratorCommandQueue;
}

export function getOrchestratorCommandQueuePath() {
  return path.resolve(process.env.ORCHESTRATOR_COMMAND_QUEUE_PATH || path.join(process.cwd(), '.orchestrator', 'terminal-intents.json'));
}

function getState(): CommandQueueState {
  const globalStore = globalThis as any;
  const persistencePath = getOrchestratorCommandQueuePath();
  if (!globalStore.__sunsetPulseOrchestratorCommandQueue || globalStore.__sunsetPulseOrchestratorCommandQueue.persistencePath !== persistencePath) {
    globalStore.__sunsetPulseOrchestratorCommandQueue = loadState(persistencePath);
  }

  return globalStore.__sunsetPulseOrchestratorCommandQueue;
}

function loadState(persistencePath: string): CommandQueueState {
  try {
    if (!fs.existsSync(persistencePath)) {
      return { terminalIntents: [], persistencePath };
    }

    const parsed = JSON.parse(fs.readFileSync(persistencePath, 'utf8'));
    const intents = Array.isArray(parsed?.terminalIntents) ? parsed.terminalIntents : [];

    return {
      terminalIntents: intents.map(normalizeIntent).filter(Boolean).slice(0, MAX_TERMINAL_INTENTS) as TerminalIntent[],
      persistencePath
    };
  } catch (error) {
    console.error('[ORCHESTRATOR_QUEUE_LOAD_ERROR]', error);
    return { terminalIntents: [], persistencePath };
  }
}

function persistState(state: CommandQueueState) {
  try {
    fs.mkdirSync(path.dirname(state.persistencePath), { recursive: true });
    const payload = JSON.stringify({
      version: QUEUE_VERSION,
      updatedAt: new Date().toISOString(),
      terminalIntents: state.terminalIntents.slice(0, MAX_TERMINAL_INTENTS)
    }, null, 2);
    const tempPath = `${state.persistencePath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tempPath, payload);
    fs.renameSync(tempPath, state.persistencePath);
  } catch (error) {
    console.error('[ORCHESTRATOR_QUEUE_SAVE_ERROR]', error);
  }
}

function normalizeIntent(input: any): TerminalIntent | null {
  if (!input?.id || !input?.command) return null;
  const now = new Date().toISOString();

  return {
    id: String(input.id),
    createdAt: String(input.createdAt || now),
    updatedAt: String(input.updatedAt || input.createdAt || now),
    source: input.source === 'telegram' ? 'telegram' : 'console',
    chatId: input.chatId === undefined || input.chatId === null ? null : String(input.chatId),
    username: input.username === undefined || input.username === null ? null : String(input.username),
    command: String(input.command),
    riskLevel: normalizeRiskLevel(input.riskLevel),
    reason: String(input.reason || 'Loaded from persisted queue.'),
    status: normalizeStatus(input.status),
    approvedAt: optionalString(input.approvedAt),
    approvedBy: optionalString(input.approvedBy),
    rejectedAt: optionalString(input.rejectedAt),
    rejectedBy: optionalString(input.rejectedBy),
    startedAt: optionalString(input.startedAt),
    completedAt: optionalString(input.completedAt),
    exitCode: typeof input.exitCode === 'number' ? input.exitCode : input.exitCode === null ? null : undefined,
    stdout: optionalString(input.stdout),
    stderr: optionalString(input.stderr),
    executionError: optionalString(input.executionError),
    cwd: optionalString(input.cwd)
  };
}

function normalizeRiskLevel(riskLevel: any): TerminalRiskLevel {
  return riskLevel === 'high' || riskLevel === 'medium' || riskLevel === 'low' ? riskLevel : 'medium';
}

function normalizeStatus(status: any): TerminalIntent['status'] {
  const allowed = ['pending', 'approved', 'running', 'completed', 'failed', 'cancelled', 'rejected'];
  return allowed.includes(status) ? status : 'pending';
}

function optionalString(value: any) {
  return value === undefined || value === null ? undefined : String(value);
}

function createIntentId() {
  return `intent-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
