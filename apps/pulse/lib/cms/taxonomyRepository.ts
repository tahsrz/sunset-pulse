import type { ClientSession, PipelineStage } from 'mongoose';
import VibeTerm from '@/models/VibeTerm';
import VibeTermRelationship from '@/models/VibeTermRelationship';
import Vibe from '@/models/Vibe';
import VibeTaxonomy from '@/models/VibeTaxonomy';

export type TaxonomyRelationshipDiff = {
  addTermIds: string[];
  removeTermIds: string[];
};

export function diffTaxonomyUsageCounts(embedded: Record<string, number>, normalized: Record<string, number>) {
  const termIds = new Set([...Object.keys(embedded), ...Object.keys(normalized)]);
  return [...termIds].filter((termId) => (embedded[termId] || 0) !== (normalized[termId] || 0)).sort();
}

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
  const existing = await relationshipQuery.lean() as unknown as Array<{ termId: unknown }>;
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

export async function countNormalizedTaxonomyUsage(tenantId: string) {
  const rows = await VibeTermRelationship.aggregate(buildNormalizedTaxonomyUsagePipeline(tenantId));
  return Object.fromEntries(rows.map(({ _id, count }: { _id: string; count: number }) => [_id, count]));
}

export async function countEmbeddedTaxonomyUsage(tenantId: string) {
  const rows = await Vibe.aggregate([
    { $match: { tenantId, status: { $ne: 'trash' } } },
    { $unwind: '$taxonomyTermIds' },
    { $group: { _id: '$taxonomyTermIds', count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map(({ _id, count }: { _id: string; count: number }) => [_id, count]));
}

export async function listNormalizedTaxonomyTerms(tenantId: string, includeArchived = false) {
  return VibeTerm.aggregate(buildNormalizedTaxonomyCatalogPipeline(tenantId, includeArchived)) as Promise<Array<{ id: string; group: string; term: string; label: string; description?: string; status: 'active' | 'archived'; parentId?: string }>>;
}

export function buildNormalizedTaxonomyCatalogPipeline(tenantId: string, includeArchived = false): PipelineStage[] {
  return [
    { $match: { tenantId, status: includeArchived ? { $in: ['active', 'archived'] } : 'active' } },
    { $lookup: { from: VibeTaxonomy.collection.name, localField: 'taxonomyId', foreignField: '_id', as: 'taxonomy' } },
    { $unwind: '$taxonomy' },
    { $match: { 'taxonomy.tenantId': tenantId, 'taxonomy.status': 'active' } },
    { $lookup: { from: VibeTerm.collection.name, localField: 'parentTermId', foreignField: '_id', as: 'parent' } },
    { $project: {
      _id: 0,
      id: { $ifNull: ['$legacyId', { $concat: ['$taxonomy.slug', ':', '$slug'] }] },
      group: { $ifNull: [{ $arrayElemAt: [{ $split: ['$legacyId', ':'] }, 0] }, '$taxonomy.slug'] },
      term: '$slug',
      label: '$label',
      description: '$description',
      status: '$status',
      parentId: { $arrayElemAt: ['$parent.legacyId', 0] },
    } },
    { $sort: { group: 1, term: 1 } },
  ];
}

export async function listNormalizedTaxonomyGroups(tenantId: string) {
  const groups = await VibeTaxonomy.find({ tenantId, status: 'active' }).select('slug label hierarchical').sort({ label: 1 }).lean() as unknown as Array<{ slug: string; label: string; hierarchical?: boolean }>;
  return groups.map((group) => ({ slug: group.slug, label: group.label, hierarchical: Boolean(group.hierarchical) }));
}

export async function createNormalizedTaxonomyGroup(input: {
  tenantId: string;
  slug: string;
  label: string;
  hierarchical: boolean;
}) {
  try {
    const created = await VibeTaxonomy.create({ ...input, status: 'active' });
    return { slug: created.slug, label: created.label, hierarchical: Boolean(created.hierarchical) };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) throw new Error('TAXONOMY_EXISTS');
    throw error;
  }
}

export async function updateNormalizedTaxonomyGroupLabel(input: {
  tenantId: string;
  slug: string;
  label: string;
}) {
  const updated = await VibeTaxonomy.findOneAndUpdate(
    { tenantId: input.tenantId, slug: input.slug, status: 'active' },
    { $set: { label: input.label } },
    { new: true },
  ).lean() as { slug: string; label: string; hierarchical?: boolean } | null;
  if (!updated) throw new Error('TAXONOMY_NOT_FOUND');
  return { slug: updated.slug, label: updated.label, hierarchical: Boolean(updated.hierarchical) };
}

export async function createNormalizedTaxonomyTerm(input: {
  tenantId: string;
  group: string;
  term: string;
  label: string;
  description?: string;
  parentTerm?: string;
}) {
  const taxonomy = await VibeTaxonomy.findOne({ tenantId: input.tenantId, slug: input.group, status: 'active' }).select('_id').lean() as { _id: unknown } | null;
  if (!taxonomy) throw new Error('TAXONOMY_NOT_FOUND');
  const parent = input.parentTerm
    ? await VibeTerm.findOne({ tenantId: input.tenantId, taxonomyId: taxonomy._id, slug: input.parentTerm, status: 'active' }).select('_id legacyId').lean() as { _id: unknown; legacyId?: string } | null
    : null;
  if (input.parentTerm && !parent) throw new Error('PARENT_TERM_NOT_FOUND');
  try {
    const created = await VibeTerm.create({
      tenantId: input.tenantId,
      taxonomyId: taxonomy._id,
      slug: input.term,
      label: input.label,
      description: input.description || '',
      legacyId: `${input.group}:${input.term}`,
      ...(parent ? { parentTermId: parent._id } : {}),
      status: 'active',
    });
    return { id: created.legacyId, group: input.group, term: created.slug, label: created.label, description: created.description || '', ...(parent ? { parentId: parent.legacyId || `${input.group}:${input.parentTerm}` } : {}) };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) throw new Error('TERM_EXISTS');
    throw error;
  }
}

export async function updateNormalizedTaxonomyTermLabel(input: {
  tenantId: string;
  group: string;
  term: string;
  label: string;
  description?: string;
}) {
  const taxonomy = await VibeTaxonomy.findOne({ tenantId: input.tenantId, slug: input.group, status: 'active' }).select('_id').lean() as { _id: unknown } | null;
  if (!taxonomy) throw new Error('TAXONOMY_NOT_FOUND');
  const updated = await VibeTerm.findOneAndUpdate(
    { tenantId: input.tenantId, taxonomyId: taxonomy._id, slug: input.term, status: 'active' },
    { $set: { label: input.label, ...(input.description !== undefined ? { description: input.description } : {}) } },
    { new: true },
  ).lean() as { legacyId?: string; slug: string; label: string; description?: string } | null;
  if (!updated) throw new Error('TERM_NOT_FOUND');
  return { id: updated.legacyId || `${input.group}:${updated.slug}`, group: input.group, term: updated.slug, label: updated.label, description: updated.description || '' };
}

export async function archiveNormalizedTaxonomyTerm(input: {
  tenantId: string;
  group: string;
  term: string;
}) {
  const taxonomy = await VibeTaxonomy.findOne({ tenantId: input.tenantId, slug: input.group, status: 'active' }).select('_id').lean() as { _id: unknown } | null;
  if (!taxonomy) throw new Error('TAXONOMY_NOT_FOUND');
  const archived = await VibeTerm.findOneAndUpdate(
    { tenantId: input.tenantId, taxonomyId: taxonomy._id, slug: input.term, status: 'active' },
    { $set: { status: 'archived' } },
    { new: true },
  ).lean() as { legacyId?: string; slug: string; label: string; description?: string } | null;
  if (!archived) throw new Error('TERM_NOT_FOUND');
  return { id: archived.legacyId || `${input.group}:${archived.slug}`, group: input.group, term: archived.slug, label: archived.label, description: archived.description || '', status: 'archived' as const };
}

export async function restoreNormalizedTaxonomyTerm(input: {
  tenantId: string;
  group: string;
  term: string;
}) {
  const taxonomy = await VibeTaxonomy.findOne({ tenantId: input.tenantId, slug: input.group, status: 'active' }).select('_id').lean() as { _id: unknown } | null;
  if (!taxonomy) throw new Error('TAXONOMY_NOT_FOUND');
  const restored = await VibeTerm.findOneAndUpdate(
    { tenantId: input.tenantId, taxonomyId: taxonomy._id, slug: input.term, status: 'archived' },
    { $set: { status: 'active' } },
    { new: true },
  ).lean() as { legacyId?: string; slug: string; label: string; description?: string } | null;
  if (!restored) throw new Error('TERM_NOT_FOUND');
  return { id: restored.legacyId || `${input.group}:${restored.slug}`, group: input.group, term: restored.slug, label: restored.label, description: restored.description || '' };
}

export function buildNormalizedTaxonomyUsagePipeline(tenantId: string) {
  return [
    { $match: { tenantId } },
    { $lookup: { from: VibeTerm.collection.name, localField: 'termId', foreignField: '_id', as: 'term' } },
    { $unwind: '$term' },
    { $match: { 'term.status': 'active', 'term.legacyId': { $type: 'string' } } },
    { $lookup: { from: Vibe.collection.name, let: { relationshipVibeId: '$vibeId', relationshipTenantId: '$tenantId' }, pipeline: [
      { $match: { $expr: { $and: [{ $eq: ['$vibeId', '$$relationshipVibeId'] }, { $eq: ['$tenantId', '$$relationshipTenantId'] }] } } },
      { $match: { status: { $ne: 'trash' } } },
      { $limit: 1 },
    ], as: 'vibe' } },
    { $match: { 'vibe.0': { $exists: true } } },
    { $group: { _id: '$term.legacyId', count: { $sum: 1 } } },
  ];
}
