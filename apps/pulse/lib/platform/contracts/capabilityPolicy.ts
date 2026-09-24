import { z } from 'zod';

const sha256 = z.string().regex(/^[a-f0-9]{64}$/);
const boundedKey = z.string().regex(/^[a-z][a-z0-9_.:-]{0,127}$/);

// Declarative capability metadata only. This contract describes what a future
// policy engine may review; it does not authorize a call or retain credentials.
export const capabilityDeclarationSchema = z.object({
  connectionId: boundedKey,
  tool: boundedKey,
  operation: boundedKey,
  inputSchemaHash: sha256,
  outputSchemaHash: sha256,
  actionClass: z.enum(['read', 'prepare', 'external_effect']),
}).strict();

export const capabilityPolicySchema = z.object({
  policyVersion: z.literal(1),
  capabilities: z.array(capabilityDeclarationSchema).max(32),
  allowedConnections: z.array(boundedKey).max(32),
  externalEffectsEnabled: z.literal(false),
}).strict().superRefine((policy, ctx) => {
  const identities = policy.capabilities.map((capability) => `${capability.connectionId}:${capability.tool}:${capability.operation}`);
  if (new Set(identities).size !== identities.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['capabilities'], message: 'Capability identities must be unique.' });
  }
  if (policy.capabilities.some((capability) => !policy.allowedConnections.includes(capability.connectionId))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['allowedConnections'], message: 'Every capability connection must be explicitly allowed.' });
  }
  if (policy.capabilities.some((capability) => capability.actionClass === 'external_effect')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['capabilities'], message: 'External effects remain disabled until execution policy and receipts are implemented.' });
  }
});

export const effectReceiptSchema = z.object({
  receiptVersion: z.literal(1),
  operationId: z.string().uuid(),
  operationHash: sha256,
  targetHash: sha256,
  status: z.enum(['prepared', 'submitted', 'accepted', 'unknown', 'failed', 'reconciled']),
  checkpointId: z.string().uuid().nullable(),
  providerReceiptRef: z.string().trim().min(1).max(240).nullable(),
  createdAt: z.string().datetime({ offset: true }),
  resolvedAt: z.string().datetime({ offset: true }).nullable(),
}).strict().superRefine((receipt, ctx) => {
  const terminal = ['accepted', 'failed', 'reconciled'].includes(receipt.status);
  if (terminal && !receipt.resolvedAt) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['resolvedAt'], message: 'Terminal receipts require a resolution timestamp.' });
  if (receipt.status === 'accepted' && !receipt.providerReceiptRef) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['providerReceiptRef'], message: 'Accepted effects require a provider receipt reference.' });
  }
});

export type CapabilityDeclaration = z.infer<typeof capabilityDeclarationSchema>;
export type CapabilityPolicy = z.infer<typeof capabilityPolicySchema>;
export type EffectReceipt = z.infer<typeof effectReceiptSchema>;
