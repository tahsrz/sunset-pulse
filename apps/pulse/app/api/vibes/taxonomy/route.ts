import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/core/database';
import { listVibeTaxonomyTerms } from '@/lib/cms/taxonomy';
import { archiveNormalizedTaxonomyTerm, countEmbeddedTaxonomyUsage, countNormalizedTaxonomyUsage, createNormalizedTaxonomyTerm, listNormalizedTaxonomyGroups, listNormalizedTaxonomyTerms, restoreNormalizedTaxonomyTerm, updateNormalizedTaxonomyTermLabel } from '@/lib/cms/taxonomyRepository';
import { buildTaxonomyReconciliationReport } from '@/lib/cms/taxonomyReconciliation';

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get('tenantId')?.trim() || 'default';
  await connectDB();
  const counts = await countEmbeddedTaxonomyUsage(tenantId);
  const compareReads = process.env.VIBE_TAXONOMY_COMPARE_READS === '1';
  const normalizedRead = process.env.VIBE_TAXONOMY_NORMALIZED_READ === '1';
  const manageTerms = normalizedRead && process.env.VIBE_TAXONOMY_MANAGE_TERMS === '1';
  const includeArchived = manageTerms && request.nextUrl.searchParams.get('includeArchived') === '1';
  let normalizedCounts: Record<string, number> | null = null;
  let normalizedTerms: Array<{ id: string; group: string; term: string; label: string; description?: string; status: 'active' | 'archived'; parentId?: string }> | null = null;
  let normalizedGroups: Array<{ slug: string; label: string; hierarchical: boolean; status: 'active' | 'archived' }> | null = null;
  if (compareReads || normalizedRead) {
    normalizedCounts = await countNormalizedTaxonomyUsage(tenantId);
  }
  if (normalizedRead) normalizedTerms = await listNormalizedTaxonomyTerms(tenantId, includeArchived);
  if (includeArchived) normalizedGroups = await listNormalizedTaxonomyGroups(tenantId, true);
  if (compareReads && normalizedCounts) {
    const reconciliation = buildTaxonomyReconciliationReport({ tenantId, embeddedCounts: counts, normalizedCounts });
    if (reconciliation.state === 'mismatch') console.warn('VIBE_TAXONOMY_READ_MISMATCH', reconciliation);
  }
  return NextResponse.json({
    terms: normalizedRead && normalizedTerms ? normalizedTerms : listVibeTaxonomyTerms(),
    counts: normalizedRead && normalizedCounts ? normalizedCounts : counts,
    ...(normalizedGroups ? { groups: normalizedGroups } : {}),
    capabilities: {
      manageTerms,
    },
  });
}

const createTermSchema = z.object({
  tenantId: z.string().trim().min(1).max(80).default('default'),
  group: z.string().trim().regex(/^[a-z][A-Za-z0-9]*$/),
  term: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  label: z.string().trim().min(1).max(80),
  description: z.string().trim().max(240).optional(),
  parentTerm: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
});

const identifyTermSchema = createTermSchema.pick({ tenantId: true, group: true, term: true });
const updateTermSchema = createTermSchema.extend({ parentTerm: createTermSchema.shape.parentTerm.unwrap().nullable().optional() });

export async function POST(request: NextRequest) {
  if (process.env.VIBE_TAXONOMY_MANAGE_TERMS !== '1') return NextResponse.json({ error: 'Taxonomy term management is disabled.' }, { status: 404 });
  const parsed = createTermSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Use a valid group, lowercase term slug, and label.' }, { status: 400 });
  await connectDB();
  try {
    const term = await createNormalizedTaxonomyTerm(parsed.data);
    return NextResponse.json({ term }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'TAXONOMY_NOT_FOUND') return NextResponse.json({ error: 'Taxonomy group not found.' }, { status: 404 });
    if (error instanceof Error && error.message === 'PARENT_TERM_NOT_FOUND') return NextResponse.json({ error: 'Parent term not found in this taxonomy.' }, { status: 400 });
    if (error instanceof Error && error.message === 'TERM_EXISTS') return NextResponse.json({ error: 'A term with this slug already exists in the group.' }, { status: 409 });
    return NextResponse.json({ error: 'Unable to create taxonomy term.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (process.env.VIBE_TAXONOMY_MANAGE_TERMS !== '1') return NextResponse.json({ error: 'Taxonomy term management is disabled.' }, { status: 404 });
  const parsed = updateTermSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Use a valid group, lowercase term slug, and label.' }, { status: 400 });
  await connectDB();
  try {
    const term = await updateNormalizedTaxonomyTermLabel(parsed.data);
    return NextResponse.json({ term });
  } catch (error) {
    if (error instanceof Error && (error.message === 'TAXONOMY_NOT_FOUND' || error.message === 'TERM_NOT_FOUND')) return NextResponse.json({ error: 'Taxonomy term not found.' }, { status: 404 });
    if (error instanceof Error && error.message === 'PARENT_TERM_NOT_FOUND') return NextResponse.json({ error: 'Parent term not found in this taxonomy.' }, { status: 400 });
    if (error instanceof Error && error.message === 'PARENT_TERM_CYCLE') return NextResponse.json({ error: 'A term cannot be its own ancestor.' }, { status: 409 });
    if (error instanceof Error && error.message === 'TAXONOMY_NOT_HIERARCHICAL') return NextResponse.json({ error: 'Flat taxonomies cannot have parent terms.' }, { status: 400 });
    return NextResponse.json({ error: 'Unable to update taxonomy term.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (process.env.VIBE_TAXONOMY_MANAGE_TERMS !== '1') return NextResponse.json({ error: 'Taxonomy term management is disabled.' }, { status: 404 });
  const parsed = identifyTermSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Use a valid group and lowercase term slug.' }, { status: 400 });
  await connectDB();
  try {
    const term = await archiveNormalizedTaxonomyTerm(parsed.data);
    return NextResponse.json({ term });
  } catch (error) {
    if (error instanceof Error && error.message === 'TERM_HAS_CHILDREN') return NextResponse.json({ error: 'Reassign or archive this term’s active children first.' }, { status: 409 });
    if (error instanceof Error && (error.message === 'TAXONOMY_NOT_FOUND' || error.message === 'TERM_NOT_FOUND')) return NextResponse.json({ error: 'Taxonomy term not found.' }, { status: 404 });
    return NextResponse.json({ error: 'Unable to archive taxonomy term.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (process.env.VIBE_TAXONOMY_MANAGE_TERMS !== '1') return NextResponse.json({ error: 'Taxonomy term management is disabled.' }, { status: 404 });
  const parsed = identifyTermSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Use a valid group and lowercase term slug.' }, { status: 400 });
  await connectDB();
  try {
    const term = await restoreNormalizedTaxonomyTerm(parsed.data);
    return NextResponse.json({ term });
  } catch (error) {
    if (error instanceof Error && (error.message === 'TAXONOMY_NOT_FOUND' || error.message === 'TERM_NOT_FOUND')) return NextResponse.json({ error: 'Archived taxonomy term not found.' }, { status: 404 });
    return NextResponse.json({ error: 'Unable to restore taxonomy term.' }, { status: 500 });
  }
}
