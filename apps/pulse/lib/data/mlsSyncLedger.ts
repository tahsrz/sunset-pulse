import fs from 'fs';
import path from 'path';
import type { MlsProviderName, NormalizedMlsListing } from './mlsTypes';
import { supabaseAdmin } from '@/lib/supabase';

export type MlsSyncRunStatus = 'running' | 'completed' | 'failed';
export type MlsSyncListingOutcome = 'synced' | 'skipped' | 'failed';

export type MlsSyncRun = {
  id: string;
  provider: MlsProviderName;
  status: MlsSyncRunStatus;
  params: Record<string, any>;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  metrics: {
    received: number;
    synced: number;
    skipped: number;
    failed: number;
  };
  failures: Array<{
    at: string;
    mls_id: string | null;
    name: string | null;
    error: string;
  }>;
};

type MlsSyncLedgerState = {
  runs: MlsSyncRun[];
  persistencePath: string;
};

const LEDGER_VERSION = 1;
const MAX_SYNC_RUNS = 30;
const MAX_FAILURES_PER_RUN = 25;

export function beginMlsSyncRun(input: { provider: MlsProviderName; params?: Record<string, any> }) {
  const state = getState();
  const now = new Date().toISOString();
  const run: MlsSyncRun = {
    id: createRunId(),
    provider: input.provider,
    status: 'running',
    params: scrubParams(input.params || {}),
    startedAt: now,
    updatedAt: now,
    completedAt: null,
    durationMs: null,
    metrics: {
      received: 0,
      synced: 0,
      skipped: 0,
      failed: 0,
    },
    failures: [],
  };

  state.runs.unshift(run);
  state.runs = state.runs.slice(0, MAX_SYNC_RUNS);
  persistState(state);
  return run;
}

export function recordMlsSyncListing(
  runId: string,
  input: {
    listing: Partial<NormalizedMlsListing> | null;
    outcome: MlsSyncListingOutcome;
    error?: unknown;
  }
) {
  const state = getState();
  const run = state.runs.find((candidate) => candidate.id === runId);
  if (!run) return null;

  run.metrics.received += 1;
  run.metrics[input.outcome] += 1;
  run.updatedAt = new Date().toISOString();

  if (input.outcome === 'failed') {
    run.failures.unshift({
      at: run.updatedAt,
      mls_id: input.listing?.mls_id ? String(input.listing.mls_id) : null,
      name: input.listing?.name ? String(input.listing.name) : null,
      error: formatError(input.error),
    });
    run.failures = run.failures.slice(0, MAX_FAILURES_PER_RUN);
  }

  persistState(state);
  return run;
}

export function finishMlsSyncRun(runId: string, input: { status?: MlsSyncRunStatus; error?: unknown } = {}) {
  const state = getState();
  const run = state.runs.find((candidate) => candidate.id === runId);
  if (!run) return null;

  const now = new Date().toISOString();
  run.status = input.status || (run.metrics.failed > 0 ? 'completed' : 'completed');
  run.updatedAt = now;
  run.completedAt = now;
  run.durationMs = Math.max(0, Date.parse(now) - Date.parse(run.startedAt));

  if (input.error) {
    run.status = 'failed';
    run.failures.unshift({
      at: now,
      mls_id: null,
      name: null,
      error: formatError(input.error),
    });
    run.failures = run.failures.slice(0, MAX_FAILURES_PER_RUN);
  }

  persistState(state);
  return run;
}

export function listMlsSyncRuns(input: { limit?: number; status?: MlsSyncRunStatus } = {}) {
  const limit = Math.max(1, Math.min(Number(input.limit || 10), MAX_SYNC_RUNS));
  return getState().runs
    .filter((run) => !input.status || run.status === input.status)
    .slice(0, limit);
}

export function getMlsSyncSnapshot() {
  const runs = listMlsSyncRuns({ limit: 10 });
  const latest = runs[0] || null;
  const latestCompleted = runs.find((run) => run.status === 'completed') || null;
  const running = runs.filter((run) => run.status === 'running');

  return {
    persistencePath: getMlsSyncLedgerPath(),
    latest,
    latestCompleted,
    runningCount: running.length,
    recentRuns: runs,
  };
}

/**
 * Persists the in-process run snapshot to Postgres. The file ledger remains a
 * local/test fallback, while production observability survives serverless
 * instance recycling.
 */
export async function persistMlsSyncRun(run: MlsSyncRun) {
  if (process.env.NODE_ENV === 'test' || process.env.MLS_SYNC_DB_DISABLED === 'true') return;

  const { error } = await supabaseAdmin.from('mls_sync_runs').upsert({
    id: run.id,
    provider: run.provider,
    status: run.status,
    params: run.params,
    received: run.metrics.received,
    synced: run.metrics.synced,
    skipped: run.metrics.skipped,
    failed: run.metrics.failed,
    error: run.failures[0]?.error || null,
    started_at: run.startedAt,
    updated_at: run.updatedAt,
    completed_at: run.completedAt,
    duration_ms: run.durationMs,
  }, { onConflict: 'id' });

  if (error) throw new Error(`MLS sync run persistence failed: ${error.message}`);

  const { error: deleteError } = await supabaseAdmin
    .from('mls_sync_failures')
    .delete()
    .eq('run_id', run.id);
  if (deleteError) throw new Error(`MLS sync failure reset failed: ${deleteError.message}`);

  if (run.failures.length) {
    const { error: failureError } = await supabaseAdmin.from('mls_sync_failures').insert(
      run.failures.map((failure) => ({
        run_id: run.id,
        mls_id: failure.mls_id,
        name: failure.name,
        error: failure.error,
        occurred_at: failure.at,
      }))
    );
    if (failureError) throw new Error(`MLS sync failure persistence failed: ${failureError.message}`);
  }
}

export function resetMlsSyncLedgerForTests() {
  const state = getState();
  state.runs = [];
  persistState(state);
}

export function reloadMlsSyncLedgerForTests() {
  const globalStore = globalThis as any;
  delete globalStore.__sunsetPulseMlsSyncLedger;
}

export function getMlsSyncLedgerPath() {
  return path.resolve(process.env.MLS_SYNC_LEDGER_PATH || path.join(process.cwd(), '.orchestrator', 'mls-sync-runs.json'));
}

function getState(): MlsSyncLedgerState {
  const globalStore = globalThis as any;
  const persistencePath = getMlsSyncLedgerPath();
  if (!globalStore.__sunsetPulseMlsSyncLedger || globalStore.__sunsetPulseMlsSyncLedger.persistencePath !== persistencePath) {
    globalStore.__sunsetPulseMlsSyncLedger = loadState(persistencePath);
  }

  return globalStore.__sunsetPulseMlsSyncLedger;
}

function loadState(persistencePath: string): MlsSyncLedgerState {
  try {
    if (!fs.existsSync(persistencePath)) {
      return { runs: [], persistencePath };
    }

    const parsed = JSON.parse(fs.readFileSync(persistencePath, 'utf8'));
    const runs = Array.isArray(parsed?.runs) ? parsed.runs : [];
    return {
      runs: runs.map(normalizeRun).filter(Boolean).slice(0, MAX_SYNC_RUNS) as MlsSyncRun[],
      persistencePath,
    };
  } catch (error) {
    console.error('[MLS_SYNC_LEDGER_LOAD_ERROR]', error);
    return { runs: [], persistencePath };
  }
}

function persistState(state: MlsSyncLedgerState) {
  try {
    fs.mkdirSync(path.dirname(state.persistencePath), { recursive: true });
    const payload = JSON.stringify({
      version: LEDGER_VERSION,
      updatedAt: new Date().toISOString(),
      runs: state.runs.slice(0, MAX_SYNC_RUNS),
    }, null, 2);
    const tempPath = `${state.persistencePath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tempPath, payload);
    fs.renameSync(tempPath, state.persistencePath);
  } catch (error) {
    console.error('[MLS_SYNC_LEDGER_SAVE_ERROR]', error);
  }
}

function normalizeRun(input: any): MlsSyncRun | null {
  if (!input?.id || !input?.startedAt) return null;
  const now = new Date().toISOString();
  const metrics = input.metrics || {};

  return {
    id: String(input.id),
    provider: normalizeProvider(input.provider),
    status: normalizeStatus(input.status),
    params: scrubParams(input.params || {}),
    startedAt: String(input.startedAt),
    updatedAt: String(input.updatedAt || input.completedAt || input.startedAt || now),
    completedAt: input.completedAt ? String(input.completedAt) : null,
    durationMs: typeof input.durationMs === 'number' ? input.durationMs : null,
    metrics: {
      received: normalizeCount(metrics.received),
      synced: normalizeCount(metrics.synced),
      skipped: normalizeCount(metrics.skipped),
      failed: normalizeCount(metrics.failed),
    },
    failures: Array.isArray(input.failures)
      ? input.failures.map(normalizeFailure).filter(Boolean).slice(0, MAX_FAILURES_PER_RUN) as MlsSyncRun['failures']
      : [],
  };
}

function normalizeFailure(input: any): MlsSyncRun['failures'][number] | null {
  if (!input?.error) return null;
  return {
    at: String(input.at || new Date().toISOString()),
    mls_id: input.mls_id === undefined || input.mls_id === null ? null : String(input.mls_id),
    name: input.name === undefined || input.name === null ? null : String(input.name),
    error: String(input.error),
  };
}

function normalizeProvider(provider: any): MlsProviderName {
  return provider === 'repliers' || provider === 'bridge' || provider === 'hotsheet' || provider === 'openresync'
    ? provider
    : 'unknown';
}

function normalizeStatus(status: any): MlsSyncRunStatus {
  return status === 'running' || status === 'failed' || status === 'completed' ? status : 'failed';
}

function normalizeCount(value: any) {
  const count = Number(value);
  return Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0;
}

function scrubParams(params: Record<string, any>) {
  return Object.entries(params).reduce<Record<string, any>>((safe, [key, value]) => {
    if (/token|key|secret|password/i.test(key)) return safe;
    safe[key] = value;
    return safe;
  }, {});
}

function formatError(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error || 'Unknown MLS sync error');
}

function createRunId() {
  return `mls-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
