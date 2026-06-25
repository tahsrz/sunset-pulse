import fs from 'fs';
import path from 'path';

export type TensorZeroFeedbackMetricName =
  | 'command_center_usefulness'
  | 'command_center_actionability'
  | 'command_center_routing_correction'
  | 'command_center_needs_improvement';

export type TensorZeroFeedbackSource =
  | 'copy_answer'
  | 'action_click'
  | 'manual_helper_override'
  | 'rerun_command';

export type TensorZeroFeedbackTrace = {
  status: 'recorded' | 'disabled' | 'unavailable';
  framework: 'tensorzero';
  path: string;
  feedbackId?: string;
  metricName: TensorZeroFeedbackMetricName;
  feedbackType: 'boolean' | 'float' | 'comment';
  saved: boolean;
  reason?: string;
};

export type TensorZeroFeedbackInput = {
  metricName: TensorZeroFeedbackMetricName;
  value: boolean | number | string;
  source: TensorZeroFeedbackSource;
  commandId?: string;
  evaluationId?: string;
  episodeId?: string;
  workerId?: string;
  variantName?: string;
  context?: Record<string, string | number | boolean | null | undefined>;
};

type TensorZeroFeedbackRecord = {
  id: string;
  createdAt: string;
  projectName: string;
  metricName: TensorZeroFeedbackMetricName;
  feedbackType: TensorZeroFeedbackTrace['feedbackType'];
  value: boolean | number | string;
  source: TensorZeroFeedbackSource;
  episodeId: string | null;
  inferenceId: string | null;
  evaluationId: string | null;
  commandId: string | null;
  workerId: string | null;
  variantName: string | null;
  context: Record<string, string | number | boolean | null>;
};

const DEFAULT_FEEDBACK_FILE = 'command-feedback.tensorzero.jsonl';
const MAX_RECENT_FEEDBACK = 100;

export function recordTensorZeroFeedback(input: TensorZeroFeedbackInput): TensorZeroFeedbackTrace {
  const relativePath = path.relative(process.cwd(), tensorZeroFeedbackPath());

  if (process.env.TENSORZERO_FEEDBACK_DISABLED === 'true') {
    return {
      status: 'disabled',
      framework: 'tensorzero',
      path: relativePath,
      metricName: input.metricName,
      feedbackType: feedbackTypeForValue(input.value),
      saved: false,
      reason: 'TENSORZERO_FEEDBACK_DISABLED=true'
    };
  }

  try {
    const filePath = tensorZeroFeedbackPath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const record = buildFeedbackRecord(input);
    fs.appendFileSync(filePath, `${JSON.stringify(record)}\n`, 'utf8');

    return {
      status: 'recorded',
      framework: 'tensorzero',
      path: relativePath,
      feedbackId: record.id,
      metricName: record.metricName,
      feedbackType: record.feedbackType,
      saved: true
    };
  } catch (error) {
    return {
      status: 'unavailable',
      framework: 'tensorzero',
      path: relativePath,
      metricName: input.metricName,
      feedbackType: feedbackTypeForValue(input.value),
      saved: false,
      reason: error instanceof Error ? error.message : 'TensorZero feedback write failed'
    };
  }
}

export function getTensorZeroFeedbackSnapshot() {
  const filePath = tensorZeroFeedbackPath();
  const relativePath = path.relative(process.cwd(), filePath);

  if (!fs.existsSync(filePath)) {
    return {
      status: process.env.TENSORZERO_FEEDBACK_DISABLED === 'true' ? 'disabled' : 'empty',
      path: relativePath,
      feedbackCount: 0,
      metricCounts: {},
      sourceCounts: {},
      lastFeedbackAt: null,
      recent: []
    };
  }

  const records = readFeedbackRecords(filePath);
  return {
    status: process.env.TENSORZERO_FEEDBACK_DISABLED === 'true' ? 'disabled' : 'ready',
    path: relativePath,
    feedbackCount: records.length,
    metricCounts: countBy(records, (record) => record.metricName),
    sourceCounts: countBy(records, (record) => record.source),
    lastFeedbackAt: records.at(-1)?.createdAt || null,
    recent: records.slice(-MAX_RECENT_FEEDBACK)
  };
}

export function tensorZeroFeedbackPath() {
  return path.resolve(
    process.env.TENSORZERO_FEEDBACK_PATH ||
      path.join(process.cwd(), 'cartridges', 'tensorzero', DEFAULT_FEEDBACK_FILE)
  );
}

function buildFeedbackRecord(input: TensorZeroFeedbackInput): TensorZeroFeedbackRecord {
  const createdAt = new Date().toISOString();
  return {
    id: `t0_feedback_${hashId(`${input.metricName}:${input.commandId || ''}:${createdAt}`)}`,
    createdAt,
    projectName: process.env.TENSORZERO_PROJECT_NAME || 'sunset-pulse',
    metricName: input.metricName,
    feedbackType: feedbackTypeForValue(input.value),
    value: sanitizeFeedbackValue(input.value),
    source: input.source,
    episodeId: input.episodeId || input.commandId || null,
    inferenceId: null,
    evaluationId: input.evaluationId || null,
    commandId: input.commandId || null,
    workerId: input.workerId || null,
    variantName: input.variantName || null,
    context: sanitizeContext(input.context || {})
  };
}

function feedbackTypeForValue(value: TensorZeroFeedbackInput['value']): TensorZeroFeedbackTrace['feedbackType'] {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'float';
  return 'comment';
}

function sanitizeFeedbackValue(value: TensorZeroFeedbackInput['value']) {
  if (typeof value !== 'string') return value;
  return compact(value, 600);
}

function sanitizeContext(context: TensorZeroFeedbackInput['context']) {
  const sanitized: TensorZeroFeedbackRecord['context'] = {};
  for (const [key, value] of Object.entries(context || {})) {
    if (value === undefined) continue;
    sanitized[key] = typeof value === 'string' ? compact(value, 240) : value;
  }
  return sanitized;
}

function readFeedbackRecords(filePath: string): TensorZeroFeedbackRecord[] {
  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as TensorZeroFeedbackRecord;
      } catch {
        return null;
      }
    })
    .filter((record): record is TensorZeroFeedbackRecord => Boolean(record?.id && record?.metricName));
}

function countBy<T>(items: T[], keyForItem: (item: T) => string) {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = keyForItem(item);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function compact(value: string, limit: number) {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned.length > limit ? `${cleaned.slice(0, limit - 3)}...` : cleaned;
}

function hashId(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  return (hash >>> 0).toString(36);
}
