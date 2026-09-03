import { describe, expect, it } from 'vitest';
import { collectDescendantTermIds } from '@/lib/cms/taxonomyHierarchy';

describe('taxonomy hierarchy helpers', () => {
  it('collects every descendant while excluding siblings and ancestors', () => {
    const descendants = collectDescendantTermIds([
      { id: 'root' },
      { id: 'child', parentId: 'root' },
      { id: 'grandchild', parentId: 'child' },
      { id: 'sibling', parentId: 'root' },
      { id: 'other' },
    ], 'child');

    expect([...descendants]).toEqual(['grandchild']);
  });

  it('terminates safely when legacy data already contains a cycle', () => {
    const descendants = collectDescendantTermIds([
      { id: 'one', parentId: 'two' },
      { id: 'two', parentId: 'one' },
    ], 'one');

    expect(descendants).toEqual(new Set(['two', 'one']));
  });
});
