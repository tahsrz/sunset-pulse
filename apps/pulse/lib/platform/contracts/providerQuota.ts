import { z } from 'zod';

const providerKey = z.string().regex(/^[a-z][a-z0-9_.:-]{0,127}$/);

export const providerQuotaInputSchema = z.object({
  providerKey,
  adapterKey: providerKey,
  maxConcurrentOperations: z.number().int().min(1).max(1000),
  maxReservedCostUsd: z.number().finite().min(0).max(999999.999999),
  maxDailyCostUsd: z.number().finite().min(0).max(999999.999999),
  expectedRevision: z.number().int().positive().nullable(),
}).strict();

export type ProviderQuotaInput = z.infer<typeof providerQuotaInputSchema>;
