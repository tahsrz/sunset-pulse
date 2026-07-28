import type { CommandIntent } from './intentClassifier';

export type BudgetableContextShard = {
  source: string;
  text: string;
  score: number;
  matchReason?: string;
};

export type ContextBudgetTrace = {
  intent: CommandIntent;
  maxMemoryShards: number;
  maxAtlasShards: number;
  maxTotalShards: number;
  maxCharsPerShard: number;
  maxTokensPerShard: number;
  configSource: 'default' | 'env';
  memoryInput: number;
  atlasInput: number;
  memoryKept: number;
  atlasKept: number;
  totalKept: number;
  estimatedChars: number;
  estimatedTokens: number;
};

export type ContextBudgetProfile = {
  maxMemoryShards: number;
  maxAtlasShards: number;
  maxTotalShards: number;
  maxCharsPerShard: number;
  maxTokensPerShard: number;
};

export const DEFAULT_CONTEXT_BUDGETS: Record<CommandIntent, ContextBudgetProfile> = {
  listing_analysis: { maxMemoryShards: 2, maxAtlasShards: 4, maxTotalShards: 6, maxCharsPerShard: 520, maxTokensPerShard: 150 },
  lead_followup: { maxMemoryShards: 4, maxAtlasShards: 3, maxTotalShards: 6, maxCharsPerShard: 420, maxTokensPerShard: 120 },
  lead_prioritization: { maxMemoryShards: 4, maxAtlasShards: 3, maxTotalShards: 6, maxCharsPerShard: 420, maxTokensPerShard: 120 },
  site_billing: { maxMemoryShards: 2, maxAtlasShards: 4, maxTotalShards: 5, maxCharsPerShard: 560, maxTokensPerShard: 160 },
  service_request: { maxMemoryShards: 1, maxAtlasShards: 4, maxTotalShards: 5, maxCharsPerShard: 520, maxTokensPerShard: 150 },
  comp_analysis: { maxMemoryShards: 2, maxAtlasShards: 5, maxTotalShards: 6, maxCharsPerShard: 560, maxTokensPerShard: 160 },
  seller_update: { maxMemoryShards: 3, maxAtlasShards: 4, maxTotalShards: 6, maxCharsPerShard: 520, maxTokensPerShard: 150 },
  market_update: { maxMemoryShards: 2, maxAtlasShards: 5, maxTotalShards: 6, maxCharsPerShard: 520, maxTokensPerShard: 150 },
  neighborhood_context: { maxMemoryShards: 2, maxAtlasShards: 5, maxTotalShards: 6, maxCharsPerShard: 520, maxTokensPerShard: 150 },
  agent_voice: { maxMemoryShards: 3, maxAtlasShards: 3, maxTotalShards: 5, maxCharsPerShard: 420, maxTokensPerShard: 120 },
  system_architecture: { maxMemoryShards: 1, maxAtlasShards: 5, maxTotalShards: 6, maxCharsPerShard: 620, maxTokensPerShard: 180 },
  general_ops: { maxMemoryShards: 2, maxAtlasShards: 3, maxTotalShards: 5, maxCharsPerShard: 420, maxTokensPerShard: 120 },
};

export function budgetCommandContext<TShard extends BudgetableContextShard>(
  input: {
    intent: CommandIntent;
    memoryShards: TShard[];
    atlasShards: TShard[];
  }
): { memoryShards: TShard[]; atlasShards: TShard[]; mergedShards: TShard[]; trace: ContextBudgetTrace } {
  const { budget, configSource } = resolveContextBudget(input.intent);
  const memoryShards = input.memoryShards
    .slice(0, budget.maxMemoryShards)
    .map((shard) => compactShard(shard, budget));
  const atlasShards = input.atlasShards
    .slice(0, budget.maxAtlasShards)
    .map((shard) => compactShard(shard, budget));
  const mergedShards = dedupe([...memoryShards, ...atlasShards]).slice(0, budget.maxTotalShards);
  const estimatedChars = mergedShards.reduce((total, shard) => total + shard.text.length, 0);
  const estimatedTokens = mergedShards.reduce((total, shard) => total + estimateContextTokens(shard.text), 0);

  return {
    memoryShards,
    atlasShards,
    mergedShards,
    trace: {
      intent: input.intent,
      ...budget,
      configSource,
      memoryInput: input.memoryShards.length,
      atlasInput: input.atlasShards.length,
      memoryKept: memoryShards.length,
      atlasKept: atlasShards.length,
      totalKept: mergedShards.length,
      estimatedChars,
      estimatedTokens,
    },
  };
}

export function resolveContextBudget(intent: CommandIntent): { budget: ContextBudgetProfile; configSource: 'default' | 'env' } {
  const baseBudget = DEFAULT_CONTEXT_BUDGETS[intent] || DEFAULT_CONTEXT_BUDGETS.general_ops;
  const envBudget = parseBudgetOverrides()[intent];
  if (!envBudget) return { budget: baseBudget, configSource: 'default' };

  return {
    budget: sanitizeBudget({ ...baseBudget, ...envBudget }, baseBudget),
    configSource: 'env',
  };
}

export function estimateContextTokens(text: string) {
  const cleaned = String(text || '').trim();
  if (!cleaned) return 0;

  const wordishTokens = cleaned.split(/\s+/g).filter(Boolean).length;
  const charTokens = Math.ceil(cleaned.length / 4);
  return Math.max(wordishTokens, charTokens);
}

function compactShard<TShard extends BudgetableContextShard>(shard: TShard, budget: ContextBudgetProfile): TShard {
  const tokenLimited = compactToTokenBudget(shard.text, budget.maxTokensPerShard);
  const text = compact(tokenLimited, budget.maxCharsPerShard);
  return text === shard.text ? shard : { ...shard, text };
}

function compactToTokenBudget(value: string, maxTokens: number) {
  const cleaned = String(value || '').replace(/\s+/g, ' ').trim();
  if (estimateContextTokens(cleaned) <= maxTokens) return cleaned;

  const approximateChars = Math.max(80, maxTokens * 4);
  return compact(cleaned, approximateChars);
}

function dedupe<TShard extends BudgetableContextShard>(shards: TShard[]) {
  const seen = new Set<string>();
  return shards.filter((shard) => {
    const key = `${shard.source}:${shard.matchReason || ''}:${shard.text.slice(0, 80)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function compact(value: string, maxChars: number) {
  const cleaned = String(value || '').replace(/\s+/g, ' ').trim();
  return cleaned.length > maxChars ? `${cleaned.slice(0, maxChars - 1)}...` : cleaned;
}

function parseBudgetOverrides(): Partial<Record<CommandIntent, Partial<ContextBudgetProfile>>> {
  const raw = process.env.PULSE_COMMAND_CONTEXT_BUDGETS;
  if (!raw) return {};

  try {
    return JSON.parse(raw) as Partial<Record<CommandIntent, Partial<ContextBudgetProfile>>>;
  } catch (error) {
    console.warn('[COMMAND_CONTEXT_BUDGET_CONFIG]', error);
    return {};
  }
}

function sanitizeBudget(value: ContextBudgetProfile, fallback: ContextBudgetProfile): ContextBudgetProfile {
  return {
    maxMemoryShards: boundedInt(value.maxMemoryShards, 0, 8, fallback.maxMemoryShards),
    maxAtlasShards: boundedInt(value.maxAtlasShards, 0, 10, fallback.maxAtlasShards),
    maxTotalShards: boundedInt(value.maxTotalShards, 1, 12, fallback.maxTotalShards),
    maxCharsPerShard: boundedInt(value.maxCharsPerShard, 120, 2000, fallback.maxCharsPerShard),
    maxTokensPerShard: boundedInt(value.maxTokensPerShard, 40, 600, fallback.maxTokensPerShard),
  };
}

function boundedInt(value: unknown, min: number, max: number, fallback: number) {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(number)));
}
