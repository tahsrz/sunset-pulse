import fs from 'fs';
import path from 'path';

export type SqlsyncCommandMutationKind = 'command_query_memory' | 'command_action_memory';

export type SqlsyncCommandMutation = {
  id: string;
  createdAt: string;
  clientId: string;
  schemaVersion: 1;
  reducer: 'upsert_command_query_memory' | 'upsert_command_action_memory';
  table: SqlsyncCommandMutationKind;
  op: 'upsert';
  primaryKey: string;
  payload: Record<string, unknown>;
};

export type SqlsyncJournalTrace = {
  status: 'staged' | 'disabled' | 'unavailable';
  path: string;
  mutationId?: string;
  saved: boolean;
  reason?: string;
};

const DEFAULT_JOURNAL_FILE = 'command-journal.sqlsync.jsonl';
const MAX_RECENT_MUTATIONS = 80;

export function stageSqlsyncCommandMutation(input: {
  table: SqlsyncCommandMutationKind;
  primaryKey: string;
  reducer: SqlsyncCommandMutation['reducer'];
  payload: Record<string, unknown>;
}): SqlsyncJournalTrace {
  const relativePath = path.relative(process.cwd(), sqlsyncCommandJournalPath());

  if (process.env.PULSE_SQLSYNC_JOURNAL_DISABLED === 'true') {
    return {
      status: 'disabled',
      path: relativePath,
      saved: false,
      reason: 'PULSE_SQLSYNC_JOURNAL_DISABLED=true'
    };
  }

  try {
    const filePath = sqlsyncCommandJournalPath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const mutation = buildMutation(input);
    fs.appendFileSync(filePath, `${JSON.stringify(mutation)}\n`, 'utf8');

    return {
      status: 'staged',
      path: relativePath,
      mutationId: mutation.id,
      saved: true
    };
  } catch (error) {
    return {
      status: 'unavailable',
      path: relativePath,
      saved: false,
      reason: error instanceof Error ? error.message : 'SQLSync journal write failed'
    };
  }
}

export function getSqlsyncCommandJournalSnapshot() {
  const filePath = sqlsyncCommandJournalPath();
  const relativePath = path.relative(process.cwd(), filePath);

  if (!fs.existsSync(filePath)) {
    return {
      status: process.env.PULSE_SQLSYNC_JOURNAL_DISABLED === 'true' ? 'disabled' : 'empty',
      path: relativePath,
      mutationCount: 0,
      tableCounts: {},
      lastMutationAt: null,
      recent: []
    };
  }

  const mutations = readSqlsyncCommandMutations(filePath);
  const tableCounts = mutations.reduce<Record<string, number>>((counts, mutation) => {
    counts[mutation.table] = (counts[mutation.table] || 0) + 1;
    return counts;
  }, {});

  return {
    status: process.env.PULSE_SQLSYNC_JOURNAL_DISABLED === 'true' ? 'disabled' : 'ready',
    path: relativePath,
    mutationCount: mutations.length,
    tableCounts,
    lastMutationAt: mutations.at(-1)?.createdAt || null,
    recent: mutations.slice(-MAX_RECENT_MUTATIONS)
  };
}

export function sqlsyncCommandJournalPath() {
  return path.resolve(
    process.env.PULSE_SQLSYNC_JOURNAL_PATH ||
      path.join(process.cwd(), 'cartridges', 'sqlsync', DEFAULT_JOURNAL_FILE)
  );
}

function buildMutation(input: {
  table: SqlsyncCommandMutationKind;
  primaryKey: string;
  reducer: SqlsyncCommandMutation['reducer'];
  payload: Record<string, unknown>;
}): SqlsyncCommandMutation {
  const createdAt = new Date().toISOString();
  return {
    id: `sqlsync_${input.table}_${hashId(`${input.primaryKey}:${createdAt}`)}`,
    createdAt,
    clientId: process.env.PULSE_SQLSYNC_CLIENT_ID || 'sunset-pulse-local',
    schemaVersion: 1,
    reducer: input.reducer,
    table: input.table,
    op: 'upsert',
    primaryKey: input.primaryKey,
    payload: scrubPayload(input.payload)
  };
}

function readSqlsyncCommandMutations(filePath: string): SqlsyncCommandMutation[] {
  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as SqlsyncCommandMutation;
      } catch {
        return null;
      }
    })
    .filter((mutation): mutation is SqlsyncCommandMutation => Boolean(mutation?.id && mutation?.table));
}

function scrubPayload(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      typeof item === 'string' ? compact(item, 1200) : item
    ])
  );
}

function compact(value: string, limit: number) {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned.length > limit ? `${cleaned.slice(0, limit - 3)}...` : cleaned;
}

function hashId(value: string) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  }

  return (hash >>> 0).toString(36);
}
