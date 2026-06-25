import fs from 'fs';
import path from 'path';
import type { CommandCenterRequest, CommandCenterResponse } from '@/lib/command-center/commandRouter';

export type TensorZeroCommandEvaluationTrace = {
  status: 'scored' | 'disabled' | 'unavailable';
  framework: 'tensorzero';
  path: string;
  evaluationId?: string;
  projectName: string;
  functionName: 'sunset_command_center';
  variantName: string;
  score?: number;
  metrics?: {
    command_center_quality: number;
    command_center_grounded: boolean;
    command_center_actionable: number;
    command_center_safety: number;
  };
  gateway?: {
    status: 'not_configured' | 'configured';
    url?: string;
    note: string;
  };
  saved: boolean;
  reason?: string;
};

type TensorZeroCommandEvaluationRecord = {
  id: string;
  createdAt: string;
  projectName: string;
  functionName: 'sunset_command_center';
  variantName: string;
  workflowEvaluation: {
    taskName: string;
    episodeId: string;
    tags: Record<string, string>;
  };
  metrics: NonNullable<TensorZeroCommandEvaluationTrace['metrics']>;
  score: number;
  input: {
    commandFingerprint: string;
    commandLength: number;
    relayMode: string;
    supervisor: boolean;
    selectedWorkerId: string | null;
  };
  output: {
    commandId: string;
    intent: string;
    workerId: string;
    workerName: string;
    routeMode: string;
    confidence: number;
    actionCount: number;
    sourceCount: number;
    frameCount: number;
    hasSupervisorNotes: boolean;
  };
};

const DEFAULT_LEDGER_FILE = 'command-evaluations.tensorzero.jsonl';
const MAX_RECENT_EVALUATIONS = 80;

export function recordTensorZeroCommandEvaluation(input: {
  request: CommandCenterRequest;
  response: CommandCenterResponse;
}): TensorZeroCommandEvaluationTrace {
  const relativePath = path.relative(process.cwd(), tensorZeroCommandEvaluationPath());
  const projectName = process.env.TENSORZERO_PROJECT_NAME || 'sunset-pulse';

  if (process.env.TENSORZERO_COMMAND_EVAL_DISABLED === 'true') {
    return {
      status: 'disabled',
      framework: 'tensorzero',
      path: relativePath,
      projectName,
      functionName: 'sunset_command_center',
      variantName: variantNameForResponse(input.response),
      gateway: tensorZeroGatewayStatus(),
      saved: false,
      reason: 'TENSORZERO_COMMAND_EVAL_DISABLED=true'
    };
  }

  try {
    const filePath = tensorZeroCommandEvaluationPath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const record = buildEvaluationRecord(input.request, input.response, projectName);
    fs.appendFileSync(filePath, `${JSON.stringify(record)}\n`, 'utf8');

    return {
      status: 'scored',
      framework: 'tensorzero',
      path: relativePath,
      evaluationId: record.id,
      projectName,
      functionName: record.functionName,
      variantName: record.variantName,
      score: record.score,
      metrics: record.metrics,
      gateway: tensorZeroGatewayStatus(),
      saved: true
    };
  } catch (error) {
    return {
      status: 'unavailable',
      framework: 'tensorzero',
      path: relativePath,
      projectName,
      functionName: 'sunset_command_center',
      variantName: variantNameForResponse(input.response),
      gateway: tensorZeroGatewayStatus(),
      saved: false,
      reason: error instanceof Error ? error.message : 'TensorZero evaluation write failed'
    };
  }
}

export function getTensorZeroCommandEvaluationSnapshot() {
  const filePath = tensorZeroCommandEvaluationPath();
  const relativePath = path.relative(process.cwd(), filePath);

  if (!fs.existsSync(filePath)) {
    return {
      status: process.env.TENSORZERO_COMMAND_EVAL_DISABLED === 'true' ? 'disabled' : 'empty',
      path: relativePath,
      evaluationCount: 0,
      averageScore: null,
      functionCounts: {},
      variantCounts: {},
      lastEvaluationAt: null,
      recent: []
    };
  }

  const records = readEvaluationRecords(filePath);
  const averageScore = records.length
    ? round(records.reduce((total, record) => total + record.score, 0) / records.length)
    : null;

  return {
    status: process.env.TENSORZERO_COMMAND_EVAL_DISABLED === 'true' ? 'disabled' : 'ready',
    path: relativePath,
    evaluationCount: records.length,
    averageScore,
    functionCounts: countBy(records, (record) => record.functionName),
    variantCounts: countBy(records, (record) => record.variantName),
    lastEvaluationAt: records.at(-1)?.createdAt || null,
    recent: records.slice(-MAX_RECENT_EVALUATIONS)
  };
}

export function tensorZeroCommandEvaluationPath() {
  return path.resolve(
    process.env.TENSORZERO_COMMAND_EVAL_PATH ||
      path.join(process.cwd(), 'cartridges', 'tensorzero', DEFAULT_LEDGER_FILE)
  );
}

function buildEvaluationRecord(
  request: CommandCenterRequest,
  response: CommandCenterResponse,
  projectName: string
): TensorZeroCommandEvaluationRecord {
  const metrics = scoreCommandResponse(response);
  const commandId = response.commandId || `cmd_${hashId(`${request.command}:${Date.now()}`)}`;
  const intent = response.intent || 'UNKNOWN_COMMAND';
  const workerId = response.worker?.id || 'unknown-worker';
  const workerName = response.worker?.name || 'Unknown Worker';
  const routeMode = response.trace?.routeMode || (request.selectedWorkerId ? 'manual' : 'auto');
  const relayMode = response.result?.relayPlan?.mode || request.relayMode || 'briefing';
  const actions = Array.isArray(response.result?.actions) ? response.result.actions : [];
  const selectedShards = Array.isArray(response.trace?.selectedShards) ? response.trace.selectedShards : [];
  const frames = Array.isArray(response.result?.deliverable?.frames) ? response.result.deliverable.frames : [];
  const score = round(
    metrics.command_center_quality * 0.5 +
      metrics.command_center_actionable * 0.2 +
      metrics.command_center_safety * 0.2 +
      (metrics.command_center_grounded ? 10 : 0)
  );

  return {
    id: `t0_eval_${hashId(`${commandId}:${Date.now()}`)}`,
    createdAt: new Date().toISOString(),
    projectName,
    functionName: 'sunset_command_center',
    variantName: variantNameForResponse(response),
    workflowEvaluation: {
      taskName: intent,
      episodeId: commandId,
      tags: {
        worker: workerId,
        routeMode,
        relayMode,
        framework: 'langgraph',
        app: 'sunset-pulse'
      }
    },
    metrics,
    score,
    input: {
      commandFingerprint: hashId(request.command),
      commandLength: request.command.length,
      relayMode: request.relayMode || 'briefing',
      supervisor: Boolean(request.supervisor),
      selectedWorkerId: request.selectedWorkerId || null
    },
    output: {
      commandId,
      intent,
      workerId,
      workerName,
      routeMode,
      confidence: response.result?.confidence || 0,
      actionCount: actions.length,
      sourceCount: selectedShards.length,
      frameCount: frames.length,
      hasSupervisorNotes: Boolean(response.trace?.supervisorNotes?.length)
    }
  };
}

function scoreCommandResponse(response: CommandCenterResponse): NonNullable<TensorZeroCommandEvaluationTrace['metrics']> {
  const confidence = response.result?.confidence || 0;
  const selectedShards = Array.isArray(response.trace?.selectedShards) ? response.trace.selectedShards : [];
  const actions = Array.isArray(response.result?.actions) ? response.result.actions : [];
  const frames = Array.isArray(response.result?.deliverable?.frames) ? response.result.deliverable.frames : [];
  const confidenceScore = clamp(confidence, 0, 100);
  const sourceScore = selectedShards.length ? 100 : 35;
  const actionScore = clamp(actions.length * 28, 0, 100);
  const frameScore = clamp(frames.length * 32, 0, 100);
  const supervisorScore = response.trace?.supervisorNotes?.length ? 100 : confidence >= 82 ? 85 : 65;
  const grounded = selectedShards.length > 0 || response.trace?.queryMemory?.saved === true;

  return {
    command_center_quality: round(confidenceScore * 0.55 + sourceScore * 0.25 + frameScore * 0.2),
    command_center_grounded: grounded,
    command_center_actionable: round(actionScore),
    command_center_safety: round(supervisorScore)
  };
}

function tensorZeroGatewayStatus(): TensorZeroCommandEvaluationTrace['gateway'] {
  const url = process.env.TENSORZERO_GATEWAY_URL?.trim();
  if (!url) {
    return {
      status: 'not_configured',
      note: 'Set TENSORZERO_GATEWAY_URL to send these records through a TensorZero Gateway later.'
    };
  }

  return {
    status: 'configured',
    url,
    note: 'Local ledger is ready to map to TensorZero workflow evaluation and feedback calls.'
  };
}

function variantNameForResponse(response: CommandCenterResponse) {
  return [
    'langgraph',
    response.trace?.routeMode || 'auto',
    response.result?.relayPlan?.mode || 'briefing',
    response.worker?.id || 'unknown-worker'
  ].join('__').replace(/[^a-z0-9_]+/gi, '_').toLowerCase();
}

function readEvaluationRecords(filePath: string): TensorZeroCommandEvaluationRecord[] {
  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as TensorZeroCommandEvaluationRecord;
      } catch {
        return null;
      }
    })
    .filter((record): record is TensorZeroCommandEvaluationRecord => Boolean(record?.id && record?.functionName));
}

function countBy<T>(items: T[], keyForItem: (item: T) => string) {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = keyForItem(item);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function hashId(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  return (hash >>> 0).toString(36);
}
