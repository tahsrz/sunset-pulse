import { z } from 'zod';

const statePath = z.string().regex(/^answers(?:\.[a-z][a-z0-9_-]{0,63}){0,7}$/);
const scalar = z.union([z.string().max(4000), z.number().finite(), z.boolean(), z.null()]);

const exists = z.object({ op: z.literal('exists'), path: statePath }).strict();
const equals = z.object({ op: z.literal('equals'), path: statePath, value: scalar }).strict();
const atom = z.discriminatedUnion('op', [exists, equals]);

// The first condition slice is intentionally inert and flat: no expression
// strings, code hooks, recursive paths or arbitrary JSON evaluation.
export const conditionExpressionSchema = z.discriminatedUnion('op', [
  exists,
  equals,
  z.object({ op: z.literal('all'), conditions: z.array(atom).min(1).max(8) }).strict(),
  z.object({ op: z.literal('any'), conditions: z.array(atom).min(1).max(8) }).strict(),
]);

export const conditionNodeContractSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/),
  kind: z.literal('condition'),
  condition: conditionExpressionSchema,
  whenTrue: z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/),
  whenFalse: z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/),
}).strict();

export type ConditionExpression = z.infer<typeof conditionExpressionSchema>;
export type ConditionNodeContract = z.infer<typeof conditionNodeContractSchema>;
