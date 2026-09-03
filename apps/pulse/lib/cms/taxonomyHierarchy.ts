export type TaxonomyHierarchyTerm = {
  id: string;
  parentId?: string;
};

export function collectDescendantTermIds(terms: TaxonomyHierarchyTerm[], parentId: string) {
  const childrenByParent = new Map<string, string[]>();
  for (const term of terms) {
    if (!term.parentId) continue;
    childrenByParent.set(term.parentId, [...(childrenByParent.get(term.parentId) || []), term.id]);
  }

  const descendants = new Set<string>();
  const pending = [...(childrenByParent.get(parentId) || [])];
  while (pending.length > 0) {
    const termId = pending.shift()!;
    if (descendants.has(termId)) continue;
    descendants.add(termId);
    pending.push(...(childrenByParent.get(termId) || []));
  }
  return descendants;
}
