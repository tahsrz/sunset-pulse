export type TaxonomyUsageCounts = Record<string, number>;

export function buildTaxonomyReconciliationReport(input: {
  tenantId: string;
  embeddedCounts: TaxonomyUsageCounts;
  normalizedCounts: TaxonomyUsageCounts;
}) {
  const termIds = [...new Set([...Object.keys(input.embeddedCounts), ...Object.keys(input.normalizedCounts)])].sort();
  const terms = termIds.map((termId) => ({
    termId,
    embedded: input.embeddedCounts[termId] || 0,
    normalized: input.normalizedCounts[termId] || 0,
  }));
  const mismatches = terms.filter((term) => term.embedded !== term.normalized);
  return {
    tenantId: input.tenantId,
    state: mismatches.length === 0 ? 'agrees' as const : 'mismatch' as const,
    embeddedTotal: terms.reduce((sum, term) => sum + term.embedded, 0),
    normalizedTotal: terms.reduce((sum, term) => sum + term.normalized, 0),
    mismatchTermIds: mismatches.map((term) => term.termId),
    terms,
  };
}
