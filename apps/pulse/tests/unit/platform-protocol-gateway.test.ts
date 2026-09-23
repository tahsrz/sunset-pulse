import { describe, expect, it } from 'vitest';
import { buildMcpToolCallRequest, buildOpenApiRequest, gatewayRequestSchema, gatewayResponseSchema } from '@/lib/platform/contracts/protocolGateway';

const operationId = '00000000-0000-4000-8000-000000000001';
const hash = 'a'.repeat(64);

describe('platform protocol gateway envelopes', () => {
  it('builds bounded MCP and OpenAPI fixture requests', () => {
    expect(buildMcpToolCallRequest({ connectionId: 'crm.local', operationId, inputSchemaHash: hash, tool: 'contacts', arguments: { email: 'owner@example.test' } }).protocol).toBe('mcp');
    expect(buildOpenApiRequest({ connectionId: 'crm.local', operationId, inputSchemaHash: hash, operation: 'lookup', method: 'POST', path: '/contacts/lookup', arguments: { email: 'owner@example.test' } }).protocol).toBe('openapi');
  });

  it('rejects URLs, headers and malformed paths', () => {
    expect(gatewayRequestSchema.safeParse({ protocol: 'openapi', connectionId: 'crm.local', operationId, inputSchemaHash: hash, operation: 'lookup', method: 'POST', path: 'https://evil.test', arguments: {}, headers: { authorization: 'x' } }).success).toBe(false);
    expect(gatewayRequestSchema.safeParse({ protocol: 'mcp', connectionId: 'crm.local', operationId, inputSchemaHash: hash, tool: 'contacts', arguments: { command: 'node evil.js' } }).success).toBe(true);
  });

  it('requires safe error/result correspondence', () => {
    expect(gatewayResponseSchema.safeParse({ protocol: 'mcp', operationId, outputSchemaHash: hash, status: 'success', result: { ok: true }, error: null }).success).toBe(true);
    expect(gatewayResponseSchema.safeParse({ protocol: 'mcp', operationId, outputSchemaHash: hash, status: 'success', result: {}, error: 'unexpected' }).success).toBe(false);
  });
});
