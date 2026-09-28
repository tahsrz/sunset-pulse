import { describe, expect, it } from 'vitest';
import { conditionExpressionSchema, conditionNodeContractSchema } from '@/lib/platform/contracts/condition';

describe('inert condition-node contracts', () => {
  it('accepts bounded state predicates and boolean groups', () => {
    expect(conditionExpressionSchema.parse({ op: 'exists', path: 'answers.area' })).toEqual({ op: 'exists', path: 'answers.area' });
    expect(conditionExpressionSchema.parse({ op: 'equals', path: 'answers.area', value: 'Keller' })).toEqual({ op: 'equals', path: 'answers.area', value: 'Keller' });
    expect(conditionExpressionSchema.parse({ op: 'all', conditions: [
      { op: 'exists', path: 'answers.area' }, { op: 'equals', path: 'answers.ready', value: true },
    ] })).toBeTruthy();
  });

  it.each([
    { op: 'equals', path: 'state.__proto__', value: 'x' },
    { op: 'equals', path: 'answers.area', value: { nested: true } },
    { op: 'all', conditions: [{ op: 'any', conditions: [{ op: 'exists', path: 'answers.area' }] }] },
    { op: 'equals', path: 'answers.area', expression: 'fetch(secret)' },
  ])('rejects unbounded or executable condition data', (value) => {
    expect(conditionExpressionSchema.safeParse(value).success).toBe(false);
  });

  it('describes branch targets without admitting the node to run definitions yet', () => {
    const node = { id: 'route', kind: 'condition' as const, condition: { op: 'exists' as const, path: 'answers.area' }, whenTrue: 'ready', whenFalse: 'missing' };
    expect(conditionNodeContractSchema.parse(node)).toEqual(node);
  });
});
