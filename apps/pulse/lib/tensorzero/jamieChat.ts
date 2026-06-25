import fs from 'fs';
import path from 'path';

export type TensorZeroJamieTrace = {
  status: 'scored' | 'disabled' | 'unavailable';
  framework: 'tensorzero';
  path: string;
  turnId?: string;
  projectName: string;
  functionName: 'jamie_chat';
  variantName: string;
  score?: number;
  metrics?: {
    jamie_response_quality: number;
    jamie_tool_success: number;
    jamie_property_grounding: boolean;
    jamie_conversation_safety: number;
  };
  gateway?: {
    status: 'not_configured' | 'configured';
    url?: string;
    note: string;
  };
  saved: boolean;
  reason?: string;
};

type JamieChatMessage = {
  role?: unknown;
  content?: unknown;
};

export type TensorZeroJamieTurnInput = {
  messages: JamieChatMessage[];
  propertyData?: unknown;
  memoryContext?: unknown;
  isDevMode?: boolean;
  response: unknown;
  content: string;
  toolResults?: unknown[];
};

type TensorZeroJamieTurnRecord = {
  id: string;
  createdAt: string;
  projectName: string;
  functionName: 'jamie_chat';
  variantName: string;
  workflowEvaluation: {
    taskName: string;
    episodeId: string;
    tags: Record<string, string>;
  };
  metrics: NonNullable<TensorZeroJamieTrace['metrics']>;
  score: number;
  input: {
    messageCount: number;
    userMessageCount: number;
    lastUserFingerprint: string;
    lastUserLength: number;
    hasPropertyData: boolean;
    hasMemoryContext: boolean;
    isDevMode: boolean;
  };
  output: {
    contentLength: number;
    hasToolCalls: boolean;
    toolCallCount: number;
    toolResultCount: number;
    toolNames: string[];
    hasPropertyCards: boolean;
    fallbackLike: boolean;
  };
};

const DEFAULT_JAMIE_FILE = 'jamie-chat.tensorzero.jsonl';
const MAX_RECENT_TURNS = 80;

export function recordTensorZeroJamieTurn(input: TensorZeroJamieTurnInput): TensorZeroJamieTrace {
  const relativePath = path.relative(process.cwd(), tensorZeroJamieChatPath());
  const projectName = process.env.TENSORZERO_PROJECT_NAME || 'sunset-pulse';
  const variantName = variantNameForTurn(input);

  if (process.env.TENSORZERO_JAMIE_CHAT_DISABLED === 'true') {
    return {
      status: 'disabled',
      framework: 'tensorzero',
      path: relativePath,
      projectName,
      functionName: 'jamie_chat',
      variantName,
      gateway: tensorZeroGatewayStatus(),
      saved: false,
      reason: 'TENSORZERO_JAMIE_CHAT_DISABLED=true'
    };
  }

  try {
    const filePath = tensorZeroJamieChatPath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const record = buildJamieTurnRecord(input, projectName, variantName);
    fs.appendFileSync(filePath, `${JSON.stringify(record)}\n`, 'utf8');

    return {
      status: 'scored',
      framework: 'tensorzero',
      path: relativePath,
      turnId: record.id,
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
      functionName: 'jamie_chat',
      variantName,
      gateway: tensorZeroGatewayStatus(),
      saved: false,
      reason: error instanceof Error ? error.message : 'TensorZero Jamie turn write failed'
    };
  }
}

export function getTensorZeroJamieChatSnapshot() {
  const filePath = tensorZeroJamieChatPath();
  const relativePath = path.relative(process.cwd(), filePath);

  if (!fs.existsSync(filePath)) {
    return {
      status: process.env.TENSORZERO_JAMIE_CHAT_DISABLED === 'true' ? 'disabled' : 'empty',
      path: relativePath,
      turnCount: 0,
      averageScore: null,
      functionCounts: {},
      variantCounts: {},
      lastTurnAt: null,
      recent: []
    };
  }

  const records = readJamieTurnRecords(filePath);
  const averageScore = records.length
    ? round(records.reduce((total, record) => total + record.score, 0) / records.length)
    : null;

  return {
    status: process.env.TENSORZERO_JAMIE_CHAT_DISABLED === 'true' ? 'disabled' : 'ready',
    path: relativePath,
    turnCount: records.length,
    averageScore,
    functionCounts: countBy(records, (record) => record.functionName),
    variantCounts: countBy(records, (record) => record.variantName),
    lastTurnAt: records.at(-1)?.createdAt || null,
    recent: records.slice(-MAX_RECENT_TURNS)
  };
}

export function tensorZeroJamieChatPath() {
  return path.resolve(
    process.env.TENSORZERO_JAMIE_CHAT_PATH ||
      path.join(process.cwd(), 'cartridges', 'tensorzero', DEFAULT_JAMIE_FILE)
  );
}

function buildJamieTurnRecord(
  input: TensorZeroJamieTurnInput,
  projectName: string,
  variantName: string
): TensorZeroJamieTurnRecord {
  const lastUserMessage = [...(input.messages || [])].reverse().find((message) => message?.role === 'user');
  const lastUserContent = typeof lastUserMessage?.content === 'string' ? lastUserMessage.content : '';
  const toolCalls = toolCallsFromResponse(input.response);
  const toolNames = namesFromToolResults(input.toolResults || []);
  const metrics = scoreJamieTurn(input, toolCalls, toolNames);
  const score = round(
    metrics.jamie_response_quality * 0.45 +
      metrics.jamie_tool_success * 0.25 +
      metrics.jamie_conversation_safety * 0.2 +
      (metrics.jamie_property_grounding ? 10 : 0)
  );
  const createdAt = new Date().toISOString();
  const id = `t0_jamie_${hashId(`${lastUserContent}:${input.content.length}:${createdAt}`)}`;

  return {
    id,
    createdAt,
    projectName,
    functionName: 'jamie_chat',
    variantName,
    workflowEvaluation: {
      taskName: 'jamie_chat_turn',
      episodeId: id,
      tags: {
        app: 'sunset-pulse',
        interface: 'jamiechat',
        framework: 'tensorzero',
        provider_path: 'groq_direct'
      }
    },
    metrics,
    score,
    input: {
      messageCount: input.messages?.length || 0,
      userMessageCount: input.messages?.filter((message) => message?.role === 'user').length || 0,
      lastUserFingerprint: hashId(lastUserContent),
      lastUserLength: lastUserContent.length,
      hasPropertyData: hasMeaningfulObject(input.propertyData),
      hasMemoryContext: hasMeaningfulObject(input.memoryContext),
      isDevMode: Boolean(input.isDevMode)
    },
    output: {
      contentLength: input.content.length,
      hasToolCalls: toolCalls.length > 0,
      toolCallCount: toolCalls.length,
      toolResultCount: input.toolResults?.length || 0,
      toolNames,
      hasPropertyCards: toolNames.includes('search_properties'),
      fallbackLike: isFallbackLike(input.content)
    }
  };
}

function scoreJamieTurn(
  input: TensorZeroJamieTurnInput,
  toolCalls: unknown[],
  toolNames: string[]
): NonNullable<TensorZeroJamieTrace['metrics']> {
  const contentLength = input.content.trim().length;
  const lengthScore = contentLength >= 80 ? 90 : contentLength >= 30 ? 72 : contentLength > 0 ? 45 : 10;
  const fallbackPenalty = isFallbackLike(input.content) ? 28 : 0;
  const toolSuccess = toolCalls.length === 0
    ? 82
    : toolNames.length > 0 && !toolResultHasError(input.toolResults || [])
      ? 92
      : 42;
  const grounded = hasMeaningfulObject(input.propertyData) || toolNames.includes('search_properties');
  const safety = input.content.includes('[[JAMIE_DATA_AGGREGATION') || input.content.includes('[ACTIVE_ANALYSIS_NODES]')
    ? 55
    : 92;

  return {
    jamie_response_quality: clamp(lengthScore - fallbackPenalty, 0, 100),
    jamie_tool_success: toolSuccess,
    jamie_property_grounding: grounded,
    jamie_conversation_safety: safety
  };
}

function tensorZeroGatewayStatus(): TensorZeroJamieTrace['gateway'] {
  const url = process.env.TENSORZERO_GATEWAY_URL?.trim();
  if (!url) {
    return {
      status: 'not_configured',
      note: 'Set TENSORZERO_GATEWAY_URL to route Jamie chat turns through a TensorZero Gateway later.'
    };
  }

  return {
    status: 'configured',
    url,
    note: 'Local Jamie turn ledger is ready to map to TensorZero inference, evaluation, and feedback calls.'
  };
}

function variantNameForTurn(input: TensorZeroJamieTurnInput) {
  const parts = ['groq_direct'];
  if (toolCallsFromResponse(input.response).length > 0 || (input.toolResults?.length || 0) > 0) parts.push('tools');
  if (hasMeaningfulObject(input.propertyData)) parts.push('property_context');
  if (hasMeaningfulObject(input.memoryContext)) parts.push('memory_context');
  if (input.isDevMode) parts.push('dev');
  if (parts.length === 1) parts.push('baseline');

  return parts.join('__').replace(/[^a-z0-9_]+/gi, '_').toLowerCase();
}

function toolCallsFromResponse(response: unknown): unknown[] {
  if (!response || typeof response !== 'object') return [];
  const toolCalls = (response as { tool_calls?: unknown }).tool_calls;
  return Array.isArray(toolCalls) ? toolCalls : [];
}

function namesFromToolResults(toolResults: unknown[]) {
  return Array.from(new Set(toolResults
    .map((result) => typeof result === 'object' && result ? (result as { name?: unknown }).name : null)
    .filter((name): name is string => typeof name === 'string' && name.length > 0)))
    .slice(0, 8);
}

function toolResultHasError(toolResults: unknown[]) {
  return toolResults.some((result) => {
    if (!result || typeof result !== 'object') return false;
    const maybe = result as { error?: unknown; output?: unknown };
    if (maybe.error) return true;
    return typeof maybe.output === 'object' && maybe.output !== null && Boolean((maybe.output as { error?: unknown }).error);
  });
}

function hasMeaningfulObject(value: unknown) {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.length > 0;
  return Object.keys(value as Record<string, unknown>).length > 0;
}

function isFallbackLike(content: string) {
  const normalized = content.toLowerCase();
  return normalized.includes('assistant logic interrupted') ||
    normalized.includes("i'm checking that now") ||
    normalized.includes('chat session failed');
}

function readJamieTurnRecords(filePath: string): TensorZeroJamieTurnRecord[] {
  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as TensorZeroJamieTurnRecord;
      } catch {
        return null;
      }
    })
    .filter((record): record is TensorZeroJamieTurnRecord => Boolean(record?.id && record?.functionName));
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
