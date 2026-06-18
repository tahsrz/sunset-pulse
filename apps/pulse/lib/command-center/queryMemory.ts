import fs from 'fs';
import path from 'path';
import { extractMemoriaTerms } from '@/lib/core/memoria_builder';
import type { IntelligenceWorker } from './workerRoster';
import type { TahRelayPlan } from './relayTemplates';
import type { SaveCommandActionInput } from './actionTypes';

export type QueryMemoryShard = {
  expertId: number;
  title: string;
  source: string;
  score: number;
  concepts: string[];
  text: string;
  complexity: number;
  density: number;
  vitality: number;
  contextLevel: 'summary' | 'interface' | 'full';
  matchReason: string;
};

export type QueryMemoryTrace = {
  status: 'saved' | 'disabled' | 'unavailable';
  path: string;
  recalled: number;
  saved: boolean;
  reason?: string;
};

type QueryMemoryRecord = {
  id: string;
  createdAt: string;
  command: string;
  intent: string;
  workerId: string;
  workerName: string;
  relayTemplate: string;
  relayMode: string;
  sources: string[];
  concepts: string[];
  learned: string[];
  summary: string;
  actions: string[];
};

type SaveQueryMemoryInput = {
  commandId: string;
  command: string;
  intent: string;
  worker: IntelligenceWorker;
  relayPlan: TahRelayPlan;
  sources: Array<{
    source: string;
    concepts: string[];
    matchReason?: string;
  }>;
  summary: string;
  actions: string[];
};

const MEMORY_SOURCE = 'query_memory.tah';
const MAX_RECALL = 3;
const MAX_RECORDS_TO_SCAN = 80;

export function recallQueryMemories(command: string, worker: IntelligenceWorker): QueryMemoryShard[] {
  if (process.env.PULSE_QUERY_MEMORY_DISABLED === 'true') return [];

  const filePath = queryMemoryPath();
  if (!fs.existsSync(filePath)) return [];

  const queryTerms = new Set([
    ...extractMemoriaTerms(command),
    ...worker.tahLoadout.flatMap((file) => file.replace(/\.tah$/i, '').split(/[_-]+/)),
    worker.id
  ].map((term) => term.toLowerCase()).filter(Boolean));

  const records = readQueryMemoryRecords(filePath).slice(-MAX_RECORDS_TO_SCAN);
  return records
    .map((record, index) => {
      const haystack = [
        record.command,
        record.intent,
        record.workerId,
        record.workerName,
        record.relayTemplate,
        record.relayMode,
        record.sources.join(' '),
        record.concepts.join(' '),
        record.learned.join(' '),
        record.summary,
        record.actions.join(' ')
      ].join(' ').toLowerCase();

      const overlap = [...queryTerms].filter((term) => haystack.includes(term));
      const workerBoost = record.workerId === worker.id ? 10 : 0;
      const score = overlap.length * 14 + workerBoost + Math.min(10, record.sources.length * 2);

      return { record, score, overlap, index };
    })
    .filter((item) => item.score >= 24)
    .sort((a, b) => b.score - a.score || b.index - a.index)
    .slice(0, MAX_RECALL)
    .map((item, index) => memoryRecordToShard(item.record, item.score, index));
}

export function saveQueryMemory(input: SaveQueryMemoryInput): QueryMemoryTrace {
  const relativePath = path.relative(process.cwd(), queryMemoryPath());

  if (process.env.PULSE_QUERY_MEMORY_DISABLED === 'true') {
    return {
      status: 'disabled',
      path: relativePath,
      recalled: 0,
      saved: false,
      reason: 'PULSE_QUERY_MEMORY_DISABLED=true'
    };
  }

  try {
    const filePath = queryMemoryPath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const record: QueryMemoryRecord = {
      id: input.commandId,
      createdAt: new Date().toISOString(),
      command: compact(input.command, 420),
      intent: input.intent,
      workerId: input.worker.id,
      workerName: input.worker.name,
      relayTemplate: input.relayPlan.templateName,
      relayMode: input.relayPlan.mode,
      sources: unique(input.sources.map((source) => source.source)),
      concepts: unique(input.sources.flatMap((source) => source.concepts)).slice(0, 24),
      learned: input.relayPlan.finalScreen.learned.map((item) => compact(item, 260)),
      summary: compact(input.summary, 520),
      actions: input.actions.map((action) => compact(action, 260)).slice(0, 5)
    };

    fs.appendFileSync(filePath, `${formatQueryMemoryRecord(record)}\n`, 'utf8');

    return {
      status: 'saved',
      path: relativePath,
      recalled: 0,
      saved: true
    };
  } catch (error) {
    return {
      status: 'unavailable',
      path: relativePath,
      recalled: 0,
      saved: false,
      reason: error instanceof Error ? error.message : 'query memory write failed'
    };
  }
}

export function saveCommandActionMemory(input: SaveCommandActionInput): QueryMemoryTrace {
  const relativePath = path.relative(process.cwd(), queryMemoryPath());

  if (process.env.PULSE_QUERY_MEMORY_DISABLED === 'true') {
    return {
      status: 'disabled',
      path: relativePath,
      recalled: 0,
      saved: false,
      reason: 'PULSE_QUERY_MEMORY_DISABLED=true'
    };
  }

  try {
    const filePath = queryMemoryPath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.appendFileSync(filePath, `${formatCommandActionMemoryRecord(input)}\n`, 'utf8');

    return {
      status: 'saved',
      path: relativePath,
      recalled: 0,
      saved: true
    };
  } catch (error) {
    return {
      status: 'unavailable',
      path: relativePath,
      recalled: 0,
      saved: false,
      reason: error instanceof Error ? error.message : 'action memory write failed'
    };
  }
}

export function queryMemoryPath() {
  return path.resolve(
    process.env.PULSE_QUERY_MEMORY_PATH || path.join(process.cwd(), 'cartridges', 'query_memory.tah')
  );
}

function memoryRecordToShard(record: QueryMemoryRecord, score: number, index: number): QueryMemoryShard {
  return {
    expertId: 880000 + index,
    title: `Query Memory / ${record.relayTemplate}`,
    source: MEMORY_SOURCE,
    score,
    concepts: unique([
      record.workerId,
      record.intent.toLowerCase(),
      ...record.concepts,
      ...record.sources.map((source) => source.replace(/\.tah$/i, ''))
    ]).slice(0, 8),
    text: [
      `TYPE: sunset_pulse_query_memory`,
      `CREATED_AT: ${record.createdAt}`,
      `COMMAND: ${record.command}`,
      `WORKER: ${record.workerName}`,
      `TEMPLATE: ${record.relayTemplate}`,
      `MODE: ${record.relayMode}`,
      `SOURCES: ${record.sources.join(', ')}`,
      `LEARNED: ${record.learned.join(' | ')}`,
      `SUMMARY: ${record.summary}`,
      `ACTIONS: ${record.actions.join(' | ')}`
    ].join('\n'),
    complexity: 0.42,
    density: 0.78,
    vitality: 0.72,
    contextLevel: index === 0 ? 'interface' : 'summary',
    matchReason: 'query memory'
  };
}

function readQueryMemoryRecords(filePath: string): QueryMemoryRecord[] {
  const content = fs.readFileSync(filePath, 'utf8');
  return content
    .split(/\n---\n/g)
    .map(parseQueryMemoryBlock)
    .filter((record): record is QueryMemoryRecord => Boolean(record));
}

function parseQueryMemoryBlock(block: string): QueryMemoryRecord | null {
  const fields = parseFields(block);
  if (fields.TYPE !== 'sunset_pulse_query_memory' || !fields.MEMORY_ID) return null;

  return {
    id: fields.MEMORY_ID,
    createdAt: fields.CREATED_AT || '',
    command: fields.COMMAND || '',
    intent: fields.INTENT || '',
    workerId: fields.WORKER_ID || '',
    workerName: fields.WORKER_NAME || '',
    relayTemplate: fields.RELAY_TEMPLATE || '',
    relayMode: fields.RELAY_MODE || '',
    sources: splitList(fields.TAH_SOURCES),
    concepts: splitList(fields.CONCEPTS),
    learned: splitList(fields.LEARNED, ' | '),
    summary: fields.SUMMARY || '',
    actions: splitList(fields.ACTIONS, ' | ')
  };
}

function formatQueryMemoryRecord(record: QueryMemoryRecord) {
  return [
    '---',
    'TYPE: sunset_pulse_query_memory',
    `MEMORY_ID: ${record.id}`,
    `CREATED_AT: ${record.createdAt}`,
    `COMMAND: ${escapeLine(record.command)}`,
    `INTENT: ${escapeLine(record.intent)}`,
    `WORKER_ID: ${escapeLine(record.workerId)}`,
    `WORKER_NAME: ${escapeLine(record.workerName)}`,
    `RELAY_TEMPLATE: ${escapeLine(record.relayTemplate)}`,
    `RELAY_MODE: ${escapeLine(record.relayMode)}`,
    `TAH_SOURCES: ${record.sources.map(escapeLine).join(', ')}`,
    `CONCEPTS: ${record.concepts.map(escapeLine).join(', ')}`,
    `LEARNED: ${record.learned.map(escapeLine).join(' | ')}`,
    `SUMMARY: ${escapeLine(record.summary)}`,
    `ACTIONS: ${record.actions.map(escapeLine).join(' | ')}`
  ].join('\n');
}

function formatCommandActionMemoryRecord(input: SaveCommandActionInput) {
  return [
    '---',
    'TYPE: sunset_pulse_action_memory',
    `MEMORY_ID: action_${input.commandId}_${input.action.id}_${Date.now()}`,
    `CREATED_AT: ${new Date().toISOString()}`,
    `COMMAND_ID: ${escapeLine(input.commandId)}`,
    `COMMAND: ${escapeLine(input.command)}`,
    `WORKER_ID: ${escapeLine(input.workerId || '')}`,
    `ACTION_ID: ${escapeLine(input.action.id)}`,
    `ACTION_KIND: ${escapeLine(input.action.kind)}`,
    `ACTION_LABEL: ${escapeLine(input.action.label)}`,
    `ACTION_DESCRIPTION: ${escapeLine(input.action.description)}`,
    `ACTION_HREF: ${escapeLine(input.action.href || '')}`,
    `ACTION_COPY_TEXT: ${escapeLine(input.action.copyText || '')}`,
    `ACTION_COMMAND: ${escapeLine(input.action.command || '')}`,
    'STATUS: clicked'
  ].join('\n');
}

function parseFields(block: string) {
  const fields: Record<string, string> = {};
  for (const line of block.split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+):\s*(.*)$/);
    if (match) fields[match[1]] = match[2].trim();
  }
  return fields;
}

function splitList(value = '', separator = ', ') {
  return value
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);
}

function compact(value: string, limit: number) {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned.length > limit ? `${cleaned.slice(0, limit - 3)}...` : cleaned;
}

function escapeLine(value: string) {
  return compact(value, 800).replace(/\r?\n/g, ' ').replace(/\|/g, '/');
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
