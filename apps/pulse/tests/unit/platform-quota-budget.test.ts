import { describe, expect, it } from 'vitest';
import { quotaBudgetInputSchema } from '@/lib/platform/contracts/quotaBudget';

const budget = {
  maxConcurrentOperations: 3,
  maxStepsPerRun: 25,
  maxEstimatedCostUsd: 4,
  maxTokensPerRun: 100_000,
  maxRunEstimatedCostUsd: 1.5,
  maxRunDurationSeconds: 1800,
  expectedRevision: null,
};

describe('platform quota budget contract', () => {
  it('accepts bounded budgets and revision-checked updates', () => {
    expect(quotaBudgetInputSchema.parse(budget)).toEqual(budget);
    expect(quotaBudgetInputSchema.parse({ ...budget, expectedRevision: 2 }).expectedRevision).toBe(2);
  });

  it('rejects out-of-range values, missing concurrency caps and unknown input', () => {
    const withoutConcurrencyCap = Object.fromEntries(Object.entries(budget).filter(([key]) => key !== 'maxConcurrentOperations'));
    expect(quotaBudgetInputSchema.safeParse(withoutConcurrencyCap).success).toBe(false);
    expect(quotaBudgetInputSchema.safeParse({ ...budget, maxTokensPerRun: 10_000_001 }).success).toBe(false);
    expect(quotaBudgetInputSchema.safeParse({ ...budget, maxRunDurationSeconds: 86401 }).success).toBe(false);
    expect(quotaBudgetInputSchema.safeParse({ ...budget, expectedRevision: 0 }).success).toBe(false);
    expect(quotaBudgetInputSchema.safeParse({ ...budget, autoSend: true }).success).toBe(false);
  });
});
