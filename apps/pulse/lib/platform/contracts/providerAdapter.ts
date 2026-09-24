import { z } from 'zod';

const key = z.string().regex(/^[a-z][a-z0-9_.:-]{0,127}$/);
const usageKeys = ['request_count', 'operation_count', 'input_tokens', 'output_tokens'] as const;

const providerPricingComponentSchema = z.object({
  usageKey: z.enum(usageKeys),
  // Rate in millionths of a USD for each `chargeUnits` billable units.
  rateMicros: z.number().int().min(0).max(1_000_000_000_000),
  chargeUnits: z.number().int().min(1).max(1_000_000_000),
  maxBillableUnits: z.number().int().min(1).max(1_000_000_000_000),
  required: z.boolean(),
}).strict();

const providerAdapterContractBaseSchema = z.object({
  schemaVersion: z.literal(1),
  providerKey: key,
  adapterKey: key,
  adapterVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  idempotencyMode: z.enum(['provider_key', 'lookup_by_operation_id', 'none']),
  unknownOutcomeRecovery: z.enum(['provider_lookup', 'manual_review', 'unavailable']),
  pricingVersion: z.number().int().positive().max(1_000_000),
  currency: z.literal('USD'),
  components: z.array(providerPricingComponentSchema).min(1).max(8),
  maxCostMicrosPerOperation: z.number().int().min(0).max(1_000_000_000_000),
}).strict();

const validateProviderAdapterContract = (
  contract: z.infer<typeof providerAdapterContractBaseSchema> & { idempotencyMode: 'provider_key' | 'lookup_by_operation_id' | 'none'; unknownOutcomeRecovery: 'provider_lookup' | 'manual_review' | 'unavailable' },
  ctx: z.RefinementCtx,
) => {
  const identities = contract.components.map((component) => component.usageKey);
  if (new Set(identities).size !== identities.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['components'], message: 'Pricing usage keys must be unique.' });
  }

  const maximumCharge = contract.components.reduce((total, component) => {
    const numerator = BigInt(component.maxBillableUnits) * BigInt(component.rateMicros);
    const divisor = BigInt(component.chargeUnits);
    return total + (numerator + divisor - 1n) / divisor;
  }, 0n);
  if (maximumCharge > BigInt(contract.maxCostMicrosPerOperation)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['maxCostMicrosPerOperation'],
      message: 'Per-operation cost ceiling must cover the maximum reviewed billable quantity.',
    });
  }
  if (contract.idempotencyMode === 'none' && contract.unknownOutcomeRecovery === 'provider_lookup') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['unknownOutcomeRecovery'],
      message: 'Provider lookup recovery requires an operation identity lookup contract.',
    });
  }
};

export const providerAdapterContractSchema = providerAdapterContractBaseSchema.extend({
  reviewedBy: z.string().uuid(),
  reviewedAt: z.string().datetime({ offset: true }),
}).superRefine(validateProviderAdapterContract);

export const providerAdapterRegistrationSchema = providerAdapterContractBaseSchema
  .extend({ expectedConnectorRevision: z.number().int().positive() })
  .strict()
  .superRefine(validateProviderAdapterContract);

export type ProviderAdapterContract = z.infer<typeof providerAdapterContractSchema>;
export type ProviderUsage = Partial<Record<(typeof usageKeys)[number], number>>;

/** Computes a conservative ceiling in USD micros without floating-point math. */
export function calculateProviderCostMicros(contractInput: unknown, usageInput: unknown): bigint {
  const contract = providerAdapterContractSchema.parse(contractInput);
  const usageSchema = z.object({
    request_count: z.number().int().min(0).optional(),
    operation_count: z.number().int().min(0).optional(),
    input_tokens: z.number().int().min(0).optional(),
    output_tokens: z.number().int().min(0).optional(),
  }).strict();
  const usage = usageSchema.parse(usageInput) as ProviderUsage;
  let totalMicros = 0n;

  for (const component of contract.components) {
    const units = usage[component.usageKey];
    if (units === undefined) {
      if (component.required) throw new Error(`Missing billable usage: ${component.usageKey}`);
      continue;
    }
    if (units > component.maxBillableUnits) throw new RangeError(`Billable usage exceeds reviewed bound: ${component.usageKey}`);
    const numerator = BigInt(units) * BigInt(component.rateMicros);
    const divisor = BigInt(component.chargeUnits);
    totalMicros += (numerator + divisor - 1n) / divisor;
  }

  if (totalMicros > BigInt(contract.maxCostMicrosPerOperation)) {
    throw new RangeError('Calculated provider cost exceeds the reviewed operation ceiling.');
  }
  return totalMicros;
}
