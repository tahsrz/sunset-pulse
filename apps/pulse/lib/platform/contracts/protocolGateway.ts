import { z } from 'zod';
import { manifestObjectSchema, parseManifestValues } from './appManifest';

const key = z.string().regex(/^[a-z][a-z0-9_.:-]{0,127}$/);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const jsonValue: z.ZodType<unknown> = z.lazy(() => z.union([
  z.string().max(16000), z.number().finite(), z.boolean(), z.null(),
  z.array(jsonValue).max(64), z.record(z.string().max(160), jsonValue).superRefine((value, ctx) => {
    if (Object.keys(value).length > 64) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Object is too large.' });
  }),
]));

const envelopeBase = {
  connectionId: key,
  operationId: z.string().uuid(),
  inputSchemaHash: hash,
  arguments: z.record(z.string().max(160), jsonValue),
};

export const mcpToolCallRequestSchema = z.object({
  protocol: z.literal('mcp'), ...envelopeBase, tool: key,
}).strict();

export const openApiRequestSchema = z.object({
  protocol: z.literal('openapi'), ...envelopeBase,
  operation: key, method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']), path: z.string().regex(/^\/[a-zA-Z0-9_./:{}-]{1,240}$/),
}).strict();

export const gatewayRequestSchema = z.discriminatedUnion('protocol', [mcpToolCallRequestSchema, openApiRequestSchema]);

export const gatewayResponseSchema = z.object({
  protocol: z.enum(['mcp', 'openapi']), operationId: z.string().uuid(), outputSchemaHash: hash,
  status: z.enum(['success', 'error']), result: jsonValue, error: z.string().max(500).nullable(),
}).strict().superRefine((response, ctx) => {
  if (response.status === 'success' && response.error !== null) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['error'], message: 'Successful responses cannot contain errors.' });
  if (response.status === 'error' && response.error === null) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['error'], message: 'Failed responses require a safe error.' });
});

export const gatewayPreparationSchema = z.object({
  protocol: z.enum(['mcp', 'openapi']),
  admission: z.object({
    appInstallId: z.string().uuid(), runId: z.string().uuid(), operationId: z.string().uuid(),
    connectionId: key, tool: key, operation: key, inputSchemaHash: hash, outputSchemaHash: hash,
    payload: jsonValue, stepUnits: z.number().int().min(1).max(10000), estimatedCostUsd: z.number().finite().nonnegative(),
  }).strict(),
  connectionId: key, operationId: z.string().uuid(), inputSchemaHash: hash,
  tool: key.optional(), operation: key.optional(), method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional(),
  path: z.string().regex(/^\/[a-zA-Z0-9_./:{}-]{1,240}$/).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.admission.connectionId !== value.connectionId || value.admission.operationId !== value.operationId || value.admission.inputSchemaHash !== value.inputSchemaHash) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Gateway metadata must match the admitted operation.' });
  }
  if (value.protocol === 'mcp' && !value.tool) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['tool'], message: 'MCP requests require a tool.' });
  if (value.protocol === 'openapi' && (!value.operation || !value.method || !value.path)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'OpenAPI requests require operation, method and path.' });
});

export type GatewayRequest = z.infer<typeof gatewayRequestSchema>;
export type GatewayResponse = z.infer<typeof gatewayResponseSchema>;
export type GatewayPreparation = z.infer<typeof gatewayPreparationSchema>;

export function buildMcpToolCallRequest(input: Omit<z.infer<typeof mcpToolCallRequestSchema>, 'protocol'>) {
  return mcpToolCallRequestSchema.parse({ protocol: 'mcp', ...input });
}
export function buildOpenApiRequest(input: Omit<z.infer<typeof openApiRequestSchema>, 'protocol'>) {
  return openApiRequestSchema.parse({ protocol: 'openapi', ...input });
}

export function validateGatewayResponse(response: unknown, outputSchema: unknown, expectedOutputSchemaHash: string) {
  const parsed = gatewayResponseSchema.parse(response);
  if (parsed.outputSchemaHash !== expectedOutputSchemaHash) throw new Error('Output schema hash mismatch.');
  if (parsed.status === 'success') {
    const boundedSchema = manifestObjectSchema.parse(outputSchema);
    return { ...parsed, result: parseManifestValues(boundedSchema, parsed.result) };
  }
  return parsed;
}
