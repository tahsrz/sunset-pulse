import { afterEach, describe, expect, it } from 'vitest';
import { budgetCommandContext, estimateContextTokens, resolveContextBudget } from '@/lib/command-center/contextBudget';

const previousBudgetConfig = process.env.PULSE_COMMAND_CONTEXT_BUDGETS;

afterEach(() => {
  if (previousBudgetConfig === undefined) {
    delete process.env.PULSE_COMMAND_CONTEXT_BUDGETS;
  } else {
    process.env.PULSE_COMMAND_CONTEXT_BUDGETS = previousBudgetConfig;
  }
});

describe('command center context budgeting', () => {
  it('uses token-aware compaction and reports budget trace totals', () => {
    const longShard = 'pricing condition neighborhood compliance disclosure '.repeat(80);
    const result = budgetCommandContext({
      intent: 'listing_analysis',
      memoryShards: [{ source: 'memory.tah', text: longShard, score: 10 }],
      atlasShards: [{ source: 'atlas.tah', text: longShard, score: 12 }],
    });

    expect(result.trace).toEqual(expect.objectContaining({
      intent: 'listing_analysis',
      configSource: 'default',
      totalKept: 2,
      estimatedTokens: expect.any(Number),
      maxTokensPerShard: expect.any(Number),
    }));
    expect(result.mergedShards.every((shard) => estimateContextTokens(shard.text) <= result.trace.maxTokensPerShard + 2)).toBe(true);
  });

  it('accepts sanitized env overrides per intent', () => {
    process.env.PULSE_COMMAND_CONTEXT_BUDGETS = JSON.stringify({
      listing_analysis: {
        maxMemoryShards: 7,
        maxAtlasShards: 9,
        maxTotalShards: 11,
        maxCharsPerShard: 1600,
        maxTokensPerShard: 500,
      },
    });

    expect(resolveContextBudget('listing_analysis')).toEqual({
      configSource: 'env',
      budget: {
        maxMemoryShards: 7,
        maxAtlasShards: 9,
        maxTotalShards: 11,
        maxCharsPerShard: 1600,
        maxTokensPerShard: 500,
      },
    });
  });

  it('falls back safely when env overrides are invalid', () => {
    process.env.PULSE_COMMAND_CONTEXT_BUDGETS = JSON.stringify({
      listing_analysis: {
        maxMemoryShards: 999,
        maxAtlasShards: -20,
        maxTotalShards: 0,
        maxCharsPerShard: 'nope',
        maxTokensPerShard: 9999,
      },
    });

    const { budget } = resolveContextBudget('listing_analysis');
    expect(budget).toEqual(expect.objectContaining({
      maxMemoryShards: 8,
      maxAtlasShards: 0,
      maxTotalShards: 1,
      maxTokensPerShard: 600,
    }));
    expect(budget.maxCharsPerShard).toBe(520);
  });
});
