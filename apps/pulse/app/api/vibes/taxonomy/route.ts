import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/core/database';
import { listVibeTaxonomyTerms } from '@/lib/cms/taxonomy';
import { countEmbeddedTaxonomyUsage, countNormalizedTaxonomyUsage, createNormalizedTaxonomyTerm, listNormalizedTaxonomyTerms, updateNormalizedTaxonomyTermLabel } from '@/lib/cms/taxonomyRepository';
import { buildTaxonomyReconciliationReport } from '@/lib/cms/taxonomyReconciliation';

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get('tenantId')?.trim() || 'default';
  await connectDB();
  const counts = await countEmbeddedTaxonomyUsage(tenantId);
  const compareReads = process.env.VIBE_TAXONOMY_COMPARE_READS === '1';
  const normalizedRead = process.env.VIBE_TAXONOMY_NORMALIZED_READ === '1';
  let normalizedCounts: Record<string, number> | null = null;
  let normalizedTerms: Array<{ id: string; group: string; term: string; label: string }> | null = null;
  if (compareReads || normalizedRead) {
    normalizedCounts = await countNormalizedTaxonomyUsage(tenantId);
  }
  if (normalizedRead) normalizedTerms = await listNormalizedTaxonomyTerms(tenantId);
  if (compareReads && normalizedCounts) {
    const reconciliation = buildTaxonomyReconciliationReport({ tenantId, embeddedCounts: counts, normalizedCounts });
    if (reconciliation.state === 'mismatch') console.warn('VIBE_TAXONOMY_READ_MISMATCH', reconciliation);
  }
  return NextResponse.json({
    terms: normalizedRead && normalizedTerms ? normalizedTerms : listVibeTaxonomyTerms(),
    counts: normalizedRead && normalizedCounts ? normalizedCounts : counts,
    capabilities: {
      manageTerms: normalizedRead && process.env.VIBE_TAXONOMY_MANAGE_TERMS === '1',
    },
  });
}

const createTermSchema = z.object({
  tenantId: z.string().trim().min(1).max(80).default('default'),
  group: z.string().trim().regex(/^[a-z][A-Za-z0-9]*$/),
  term: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  label: z.string().trim().min(1).max(80),
});

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
    if (error instanceof Error && error.message === 'TERM_EXISTS') return NextResponse.json({ error: 'A term with this slug already exists in the group.' }, { status: 409 });
    return NextResponse.json({ error: 'Unable to create taxonomy term.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (process.env.VIBE_TAXONOMY_MANAGE_TERMS !== '1') return NextResponse.json({ error: 'Taxonomy term management is disabled.' }, { status: 404 });
  const parsed = createTermSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Use a valid group, lowercase term slug, and label.' }, { status: 400 });
  await connectDB();
  try {
    const term = await updateNormalizedTaxonomyTermLabel(parsed.data);
    return NextResponse.json({ term });
  } catch (error) {
    if (error instanceof Error && (error.message === 'TAXONOMY_NOT_FOUND' || error.message === 'TERM_NOT_FOUND')) return NextResponse.json({ error: 'Taxonomy term not found.' }, { status: 404 });
    return NextResponse.json({ error: 'Unable to update taxonomy term.' }, { status: 500 });
  }
}
