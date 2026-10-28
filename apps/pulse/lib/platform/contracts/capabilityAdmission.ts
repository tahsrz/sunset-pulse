import { z } from 'zod';
import { manifestObjectSchema, parseManifestValues } from './appManifest';

export const capabilityAdmissionInputSchema = z.object({
  appInstallId: z.string().guid(),
  runId: z.string().guid(),
  operationId: z.string().guid(),
  connectionId: z.string().regex(/^[a-z][a-z0-9_.:-]{0,127}$/),
  tool: z.string().regex(/^[a-z][a-z0-9_.:-]{0,127}$/),
  operation: z.string().regex(/^[a-z][a-z0-9_.:-]{0,127}$/),
  inputSchemaHash: z.string().regex(/^[a-f0-9]{64}$/),
  outputSchemaHash: z.string().regex(/^[a-f0-9]{64}$/),
  payload: z.unknown().optional(),
  stepUnits: z.number().int().min(1).max(10000),
  estimatedCostUsd: z.number().finite().nonnegative(),
  estimatedTokens: z.number().int().min(0).max(10_000_000).default(0),
}).strict();

export function validateCapabilityPayload(schema: unknown, payload: unknown) {
  const boundedSchema = manifestObjectSchema.parse(schema);
  return parseManifestValues(boundedSchema, payload);
}

export type CapabilityAdmissionInput = z.infer<typeof capabilityAdmissionInputSchema>;
