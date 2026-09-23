import { z } from 'zod';
import { manifestObjectSchema, parseManifestValues } from './appManifest';

export const capabilityAdmissionInputSchema = z.object({
  appInstallId: z.string().uuid(),
  runId: z.string().uuid(),
  operationId: z.string().uuid(),
  connectionId: z.string().regex(/^[a-z][a-z0-9_.:-]{0,127}$/),
  tool: z.string().regex(/^[a-z][a-z0-9_.:-]{0,127}$/),
  operation: z.string().regex(/^[a-z][a-z0-9_.:-]{0,127}$/),
  inputSchemaHash: z.string().regex(/^[a-f0-9]{64}$/),
  outputSchemaHash: z.string().regex(/^[a-f0-9]{64}$/),
  payload: z.unknown(),
  stepUnits: z.number().int().min(1).max(10000),
  estimatedCostUsd: z.number().finite().nonnegative(),
}).strict();

export function validateCapabilityPayload(schema: unknown, payload: unknown) {
  const boundedSchema = manifestObjectSchema.parse(schema);
  return parseManifestValues(boundedSchema, payload);
}

export type CapabilityAdmissionInput = z.infer<typeof capabilityAdmissionInputSchema>;
