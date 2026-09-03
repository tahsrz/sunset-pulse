import { describe, expect, it } from 'vitest';
import { collectDescendantTermIds, getTaxonomyTermDepths, orderTaxonomyTermsByHierarchy } from '@/lib/cms/taxonomyHierarchy';

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

  it('orders roots before descendants and retains orphans and cycles', () => {
    const ordered = orderTaxonomyTermsByHierarchy([
      { id: 'child', group: 'area', term: 'child', parentId: 'root' },
      { id: 'orphan', group: 'area', term: 'orphan', parentId: 'missing' },
      { id: 'root', group: 'area', term: 'root' },
      { id: 'cycle-a', group: 'mood', term: 'cycle-a', parentId: 'cycle-b' },
      { id: 'cycle-b', group: 'mood', term: 'cycle-b', parentId: 'cycle-a' },
    ]);

    expect(ordered.map(({ id }) => id)).toEqual(['orphan', 'root', 'child', 'cycle-a', 'cycle-b']);
  });

  it('calculates nested display depth and treats orphans and cycles as roots', () => {
    const depths = getTaxonomyTermDepths([
      { id: 'root' },
      { id: 'child', parentId: 'root' },
      { id: 'grandchild', parentId: 'child' },
      { id: 'orphan', parentId: 'missing' },
      { id: 'cycle-a', parentId: 'cycle-b' },
      { id: 'cycle-b', parentId: 'cycle-a' },
    ]);

    expect(Object.fromEntries(depths)).toEqual({ root: 0, child: 1, grandchild: 2, orphan: 0, 'cycle-a': 0, 'cycle-b': 0 });
  });
});
