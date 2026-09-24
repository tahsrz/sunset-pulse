import { describe, expect, it } from 'vitest';
import { calculateProviderCostMicros, providerAdapterContractSchema } from '@/lib/platform/contracts/providerAdapter';

const reviewed = {
  schemaVersion: 1,
  providerKey: 'example.provider',
  adapterKey: 'example.mcp',
  adapterVersion: '1.2.0',
  idempotencyMode: 'provider_key',
  unknownOutcomeRecovery: 'provider_lookup',
  pricingVersion: 3,
  currency: 'USD',
  components: [
    { usageKey: 'request_count', rateMicros: 1500, chargeUnits: 1, maxBillableUnits: 1, required: true },
    { usageKey: 'input_tokens', rateMicros: 200_000, chargeUnits: 1_000_000, maxBillableUnits: 100_000, required: true },
    { usageKey: 'output_tokens', rateMicros: 500_000, chargeUnits: 1_000_000, maxBillableUnits: 100_000, required: false },
  ],
  maxCostMicrosPerOperation: 71_500,
  reviewedBy: '34de26fc-81ac-4af7-9e10-0b0ced3e3eab',
  reviewedAt: '2026-09-23T10:00:00.000Z',
};

describe('reviewed provider adapter contract', () => {
  it('accepts bounded, versioned pricing and computes conservative micro-dollar costs', () => {
    expect(providerAdapterContractSchema.parse(reviewed)).toEqual(reviewed);
    expect(calculateProviderCostMicros(reviewed, { request_count: 1, input_tokens: 1, output_tokens: 1 })).toBe(1502n);
  });

  it('rounds fractional micro-dollar charges up and rejects missing or out-of-bound metering', () => {
    expect(calculateProviderCostMicros(reviewed, { request_count: 1, input_tokens: 1 })).toBe(1501n);
    expect(() => calculateProviderCostMicros(reviewed, { request_count: 1 })).toThrow('Missing billable usage: input_tokens');
    expect(() => calculateProviderCostMicros(reviewed, { request_count: 1, input_tokens: 100_001 })).toThrow(RangeError);
    expect(() => calculateProviderCostMicros(reviewed, { request_count: 1, input_tokens: 1, arbitrary: 1 })).toThrow();
  });

  it('rejects duplicate usage dimensions, insufficient cost ceiling, and unsupported recovery claims', () => {
    expect(providerAdapterContractSchema.safeParse({
      ...reviewed,
      maxCostMicrosPerOperation: 71_499,
    }).success).toBe(false);
    expect(providerAdapterContractSchema.safeParse({
      ...reviewed,
      components: [reviewed.components[0], reviewed.components[0]],
    }).success).toBe(false);
    expect(providerAdapterContractSchema.safeParse({
      ...reviewed,
      idempotencyMode: 'none',
    }).success).toBe(false);
  });
});
