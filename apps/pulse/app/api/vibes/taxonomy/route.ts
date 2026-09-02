import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/core/database';
import { listVibeTaxonomyTerms } from '@/lib/cms/taxonomy';
import { countEmbeddedTaxonomyUsage, countNormalizedTaxonomyUsage, listNormalizedTaxonomyTerms } from '@/lib/cms/taxonomyRepository';
import { buildTaxonomyReconciliationReport } from '@/lib/cms/taxonomyReconciliation';

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get('tenantId')?.trim() || 'default';
  await connectDB();
  const counts = await countEmbeddedTaxonomyUsage(tenantId);
  const compareReads = process.env.VIBE_TAXONOMY_COMPARE_READS === '1';
  const normalizedRead = process.env.VIBE_TAXONOMY_NORMALIZED_READ === '1';
  let normalizedCounts: Record<string, number> | null = null;
  let normalizedTerms: Array<{ id: string; group: string; term: string }> | null = null;
  if (compareReads || normalizedRead) {
    normalizedCounts = await countNormalizedTaxonomyUsage(tenantId);
  }
  if (normalizedRead) normalizedTerms = await listNormalizedTaxonomyTerms(tenantId);
  if (compareReads && normalizedCounts) {
    const reconciliation = buildTaxonomyReconciliationReport({ tenantId, embeddedCounts: counts, normalizedCounts });
    if (reconciliation.state === 'mismatch') console.warn('VIBE_TAXONOMY_READ_MISMATCH', reconciliation);
  }
  return NextResponse.json({ terms: normalizedRead && normalizedTerms ? normalizedTerms : listVibeTaxonomyTerms(), counts: normalizedRead && normalizedCounts ? normalizedCounts : counts });
}
