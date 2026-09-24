import { describe, expect, it } from 'vitest';
import { capabilityAdmissionInputSchema, validateCapabilityPayload } from '@/lib/platform/contracts/capabilityAdmission';

const schema = { type: 'object', properties: { email: { type: 'string', maxLength: 320 }, priority: { type: 'number', minimum: 1, maximum: 5 } }, required: ['email'], additionalProperties: false };

describe('platform capability payload admission', () => {
  it('defaults estimated tokens for legacy callers and bounds explicit estimates', () => {
    const base = {
      appInstallId: '00000000-0000-4000-8000-000000000001', runId: '00000000-0000-4000-8000-000000000002',
      operationId: '00000000-0000-4000-8000-000000000003', connectionId: 'crm.local', tool: 'contacts', operation: 'lookup',
      inputSchemaHash: 'a'.repeat(64), outputSchemaHash: 'b'.repeat(64), payload: { email: 'owner@example.test' },
      stepUnits: 1, estimatedCostUsd: 0.1,
    };
    expect(capabilityAdmissionInputSchema.parse(base).estimatedTokens).toBe(0);
    expect(capabilityAdmissionInputSchema.parse({ ...base, estimatedTokens: 100 }).estimatedTokens).toBe(100);
    expect(capabilityAdmissionInputSchema.safeParse({ ...base, estimatedTokens: 10_000_001 }).success).toBe(false);
  });

  it('validates payloads against the bounded reviewed schema', () => {
    expect(validateCapabilityPayload(schema, { email: 'owner@example.test', priority: 3 })).toEqual({ email: 'owner@example.test', priority: 3 });
    expect(() => validateCapabilityPayload(schema, { priority: 3 })).toThrow();
    expect(() => validateCapabilityPayload(schema, { email: 'owner@example.test', extra: true })).toThrow();
    expect(() => validateCapabilityPayload(schema, { email: 'owner@example.test', priority: 9 })).toThrow();
  });
});
