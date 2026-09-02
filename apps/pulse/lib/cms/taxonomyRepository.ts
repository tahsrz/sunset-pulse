import type { ClientSession } from 'mongoose';
import VibeTerm from '@/models/VibeTerm';
import VibeTermRelationship from '@/models/VibeTermRelationship';

export type TaxonomyRelationshipDiff = {
  addTermIds: string[];
  removeTermIds: string[];
};

export function diffTaxonomyRelationships(currentTermIds: string[], desiredTermIds: string[]): TaxonomyRelationshipDiff {
  const current = new Set(currentTermIds.map(String));
  const desired = new Set(desiredTermIds.map(String));
  return {
    addTermIds: [...desired].filter((termId) => !current.has(termId)),
    removeTermIds: [...current].filter((termId) => !desired.has(termId)),
  };
}

export async function resolveLegacyTaxonomyTermIds(input: {
  tenantId: string;
  legacyIds: string[];
  session?: ClientSession;
}) {
  const legacyIds = [...new Set(input.legacyIds.map((id) => id.trim()).filter(Boolean))];
  if (legacyIds.length === 0) return { termIds: [], unknownLegacyIds: [] };

  const query = VibeTerm.find({ tenantId: input.tenantId, legacyId: { $in: legacyIds }, status: 'active' }).select('_id legacyId');
  if (input.session) query.session(input.session);
  const terms = await query.lean() as Array<{ _id: unknown; legacyId?: string }>;
  const termByLegacyId = new Map(terms.map((term) => [String(term.legacyId), String(term._id)]));
  return {
    termIds: legacyIds.flatMap((legacyId) => termByLegacyId.get(legacyId) || []),
    unknownLegacyIds: legacyIds.filter((legacyId) => !termByLegacyId.has(legacyId)),
  };
}

export async function replaceVibeTermRelationships(input: {
  tenantId: string;
  vibeId: string;
  termIds: string[];
  actorId: string;
  session?: ClientSession;
}) {
  const desiredTermIds = [...new Set(input.termIds.map(String))];
  const relationshipQuery = VibeTermRelationship.find({ tenantId: input.tenantId, vibeId: input.vibeId }).select('termId');
  if (input.session) relationshipQuery.session(input.session);
  const existing = await relationshipQuery.lean() as Array<{ termId: unknown }>;
  const diff = diffTaxonomyRelationships(existing.map((item) => String(item.termId)), desiredTermIds);

  if (diff.removeTermIds.length > 0) {
    await VibeTermRelationship.deleteMany({ tenantId: input.tenantId, vibeId: input.vibeId, termId: { $in: diff.removeTermIds } }, { session: input.session });
  }
  if (diff.addTermIds.length > 0) {
    await VibeTermRelationship.bulkWrite(diff.addTermIds.map((termId) => ({
      updateOne: {
        filter: { tenantId: input.tenantId, vibeId: input.vibeId, termId },
        update: { $setOnInsert: { assignedBy: input.actorId } },
        upsert: true,
      },
    })), { session: input.session });
  }

  return diff;
}
