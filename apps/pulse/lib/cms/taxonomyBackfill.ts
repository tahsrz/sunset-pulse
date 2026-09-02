import { buildControlledTaxonomySeed } from './taxonomySeed';
import { resolveLegacyTaxonomyTermIds, replaceVibeTermRelationships } from './taxonomyRepository';

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

export async function writeTaxonomyBackfill(input: {
  vibes: TaxonomyBackfillVibe[];
  actorId: string;
}) {
  const report = analyzeTaxonomyBackfill(input.vibes);
  let addedRelationships = 0;
  let removedRelationships = 0;
  const unresolved: Record<string, string[]> = {};

  for (const vibe of input.vibes) {
    const tenantId = vibe.tenantId || 'default';
    const resolved = await resolveLegacyTaxonomyTermIds({ tenantId, legacyIds: vibe.taxonomyTermIds || [] });
    const diff = await replaceVibeTermRelationships({ tenantId, vibeId: vibe.vibeId, termIds: resolved.termIds, actorId: input.actorId });
    addedRelationships += diff.addTermIds.length;
    removedRelationships += diff.removeTermIds.length;
    if (resolved.unknownLegacyIds.length > 0) unresolved[`${tenantId}:${vibe.vibeId}`] = resolved.unknownLegacyIds;
  }

  return { ...report, mode: 'write' as const, addedRelationships, removedRelationships, unresolved };
}
