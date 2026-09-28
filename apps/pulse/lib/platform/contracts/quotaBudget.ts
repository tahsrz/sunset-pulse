import { z } from 'zod';

export const quotaBudgetInputSchema = z.object({
  maxConcurrentOperations: z.number().int().min(1).max(1000),
  maxStepsPerRun: z.number().int().min(1).max(10000),
  maxEstimatedCostUsd: z.number().finite().min(0).max(999999.999999),
  maxTokensPerRun: z.number().int().min(0).max(10_000_000),
  maxRunEstimatedCostUsd: z.number().finite().min(0).max(999999.999999),
  maxRunDurationSeconds: z.number().int().min(1).max(86400),
  expectedRevision: z.number().int().positive().nullable(),
}).strict();

export type QuotaBudgetInput = z.infer<typeof quotaBudgetInputSchema>;
