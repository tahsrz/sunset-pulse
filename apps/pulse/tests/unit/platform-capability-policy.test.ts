import { describe, expect, it } from 'vitest';
import { capabilityPolicySchema, effectReceiptSchema } from '@/lib/platform/contracts/capabilityPolicy';

const hash = 'a'.repeat(64);
const basePolicy = {
  policyVersion: 1 as const,
  capabilities: [{ connectionId: 'crm.local', tool: 'contacts', operation: 'lookup', inputSchemaHash: hash, outputSchemaHash: hash, actionClass: 'read' as const }],
  allowedConnections: ['crm.local'],
  externalEffectsEnabled: false as const,
};

describe('platform capability policy contracts', () => {
  it('accepts inert, explicitly allowlisted capability metadata', () => {
    expect(capabilityPolicySchema.parse(basePolicy)).toEqual(basePolicy);
  });

  it.each([
    { ...basePolicy, capabilities: [{ ...basePolicy.capabilities[0], connectionId: 'other.local' }] },
    { ...basePolicy, capabilities: [{ ...basePolicy.capabilities[0], tool: 'send_email', operation: 'send', actionClass: 'external_effect' as const }] },
    { ...basePolicy, capabilities: [{ ...basePolicy.capabilities[0], command: 'node evil.js' }] },
  ])('rejects metadata that is not safely bounded or allowlisted', (value) => {
    expect(() => capabilityPolicySchema.parse(value)).toThrow();
  });

  it('requires immutable resolution evidence for terminal effects', () => {
    const receipt = {
      receiptVersion: 1 as const,
      operationId: '00000000-0000-4000-8000-000000000001',
      operationHash: hash,
      targetHash: hash,
      status: 'accepted' as const,
      checkpointId: null,
      providerReceiptRef: 'provider-123',
      createdAt: '2026-09-22T12:00:00.000Z',
      resolvedAt: '2026-09-22T12:01:00.000Z',
    };
    expect(effectReceiptSchema.parse(receipt)).toEqual(receipt);
    expect(() => effectReceiptSchema.parse({ ...receipt, providerReceiptRef: null })).toThrow();
    expect(() => effectReceiptSchema.parse({ ...receipt, resolvedAt: null })).toThrow();
  });
});
