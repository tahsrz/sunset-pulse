import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/core/database';
import { countEmbeddedTaxonomyUsage, countNormalizedTaxonomyUsage } from '@/lib/cms/taxonomyRepository';
import { buildTaxonomyReconciliationReport } from '@/lib/cms/taxonomyReconciliation';

export async function GET(request: NextRequest) {
  if (process.env.VIBE_TAXONOMY_COMPARE_READS !== '1') {
    return NextResponse.json({ error: 'Taxonomy reconciliation is disabled.' }, { status: 404 });
  }
  const tenantId = request.nextUrl.searchParams.get('tenantId')?.trim() || 'default';
  await connectDB();
  const [embeddedCounts, normalizedCounts] = await Promise.all([
    countEmbeddedTaxonomyUsage(tenantId),
    countNormalizedTaxonomyUsage(tenantId),
  ]);
  return NextResponse.json(buildTaxonomyReconciliationReport({ tenantId, embeddedCounts, normalizedCounts }));
}
