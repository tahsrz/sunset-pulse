import { buildControlledTaxonomySeed } from './taxonomySeed';

export type TaxonomyBackfillVibe = { tenantId?: string; vibeId: string; taxonomyTermIds?: string[] };

export function analyzeTaxonomyBackfill(vibes: TaxonomyBackfillVibe[]) {
  const knownLegacyIds = new Set(buildControlledTaxonomySeed().flatMap((group) => group.terms.map((term) => term.legacyId)));
  const tenants: Record<string, { vibes: number; expectedRelationships: number; duplicateIds: number; unknownLegacyIds: string[] }> = {};

  for (const vibe of vibes) {
    const tenantId = vibe.tenantId || 'default';
    const report = tenants[tenantId] ||= { vibes: 0, expectedRelationships: 0, duplicateIds: 0, unknownLegacyIds: [] };
    const ids = (vibe.taxonomyTermIds || []).map(String);
    const uniqueIds = [...new Set(ids)];
    report.vibes += 1;
    report.expectedRelationships += uniqueIds.filter((id) => knownLegacyIds.has(id)).length;
    report.duplicateIds += ids.length - uniqueIds.length;
    report.unknownLegacyIds.push(...uniqueIds.filter((id) => !knownLegacyIds.has(id)));
  }

  for (const report of Object.values(tenants)) report.unknownLegacyIds = [...new Set(report.unknownLegacyIds)].sort();
  return {
    mode: 'dry-run' as const,
    totalVibes: vibes.length,
    expectedRelationships: Object.values(tenants).reduce((sum, tenant) => sum + tenant.expectedRelationships, 0),
    duplicateIds: Object.values(tenants).reduce((sum, tenant) => sum + tenant.duplicateIds, 0),
    unknownLegacyIds: [...new Set(Object.values(tenants).flatMap((tenant) => tenant.unknownLegacyIds))].sort(),
    tenants,
  };
}
