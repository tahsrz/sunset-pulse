export type TaxonomyHierarchyTerm = {
  id: string;
  parentId?: string;
};

export function orderTaxonomyTermsByHierarchy<T extends TaxonomyHierarchyTerm & { group: string; label?: string; term: string }>(terms: T[]) {
  const byId = new Map(terms.map((term) => [term.id, term]));
  const childrenByParent = new Map<string, T[]>();
  const rootsByGroup = new Map<string, T[]>();
  const compare = (left: T, right: T) => (left.label || left.term).localeCompare(right.label || right.term);

  for (const term of terms) {
    if (term.parentId && byId.has(term.parentId)) {
      childrenByParent.set(term.parentId, [...(childrenByParent.get(term.parentId) || []), term]);
    } else {
      rootsByGroup.set(term.group, [...(rootsByGroup.get(term.group) || []), term]);
    }
  }

  const ordered: T[] = [];
  const visited = new Set<string>();
  const append = (term: T) => {
    if (visited.has(term.id)) return;
    visited.add(term.id);
    ordered.push(term);
    [...(childrenByParent.get(term.id) || [])].sort(compare).forEach(append);
  };

  [...rootsByGroup.keys()].sort().forEach((group) => [...(rootsByGroup.get(group) || [])].sort(compare).forEach(append));
  [...terms].sort((left, right) => left.group.localeCompare(right.group) || compare(left, right)).forEach(append);
  return ordered;
}

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
