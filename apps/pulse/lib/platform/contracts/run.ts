import { z } from 'zod';
import { conditionNodeContractSchema } from './condition';

const nodeId = z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/);
export const responseSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('string'), enum: z.array(z.string().min(1).max(240)).min(1).max(30).optional() }).strict(),
  z.object({ type: z.literal('number') }).strict(),
  z.object({ type: z.literal('boolean') }).strict(),
]);

// A review target is a snapshot, not a grant to execute the referenced action.
export const checkpointTargetSchema = z.object({
  resourceType: z.string().min(1).max(120), resourceId: z.string().min(1).max(240),
  revision: z.number().int().positive(), contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  action: z.string().min(1).max(120), audienceHash: z.string().regex(/^[a-f0-9]{64}$/).optional(),
}).strict();
const checkpoint = z.object({
  id: nodeId, kind: z.literal('checkpoint'), prompt: z.string().trim().min(1).max(2000), next: nodeId,
});
export const runNodeSchema = z.union([
  checkpoint.extend({ type: z.literal('question'), responseSchema }).strict(),
  checkpoint.extend({ type: z.literal('approval'), target: checkpointTargetSchema }).strict(),
  checkpoint.extend({ type: z.literal('effect_gate'), target: checkpointTargetSchema }).strict(),
  conditionNodeContractSchema,
  z.object({ id: nodeId, kind: z.literal('complete') }).strict(),
]);
export const runDefinitionSchema = z.object({
  schemaVersion: z.literal(1), key: nodeId, version: z.number().int().positive(),
  entry: nodeId, nodes: z.array(runNodeSchema).min(1).max(64),
}).strict().superRefine((graph, ctx) => {
  const fail = (message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  if (nodes.size !== graph.nodes.length) fail('Node IDs must be unique.');
  const visited = new Set<string>();
  const pending = [graph.entry];
  while (pending.length) {
    const current = pending.pop()!;
    if (visited.has(current)) { fail('Workflow cycles or converging branches are not supported.'); break; }
    const node = nodes.get(current);
    if (!node) { fail(`Missing workflow node: ${current}`); break; }
    visited.add(current);
    if (node.kind === 'checkpoint') pending.push(node.next);
    if (node.kind === 'condition') pending.push(node.whenFalse, node.whenTrue);
  }
  if (visited.size !== nodes.size) fail('Every node must be reachable from the entry.');
});
export const startRunSchema = z.object({ requestKey: z.string().uuid(), definition: runDefinitionSchema }).strict();
export const checkpointResponseSchema = z.object({
  checkpointId: z.string().uuid(), expectedRevision: z.number().int().positive(), submissionKey: z.string().uuid(),
  value: z.union([z.string().min(1).max(4000), z.number().finite(), z.boolean()]),
}).strict();
export const cancelRunSchema = z.object({ runId: z.string().uuid(), expectedRevision: z.number().int().positive() }).strict();
export const supersedeRunSchema = cancelRunSchema.extend({
  requestKey: z.string().uuid(), definition: runDefinitionSchema, reason: z.string().trim().min(1).max(500),
}).strict();
export type RunDefinition = z.infer<typeof runDefinitionSchema>;
