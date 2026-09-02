import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/core/database';
import Vibe from '@/models/Vibe';
import { listVibeTaxonomyTerms } from '@/lib/cms/taxonomy';
import { countNormalizedTaxonomyUsage } from '@/lib/cms/taxonomyRepository';
import { buildTaxonomyReconciliationReport } from '@/lib/cms/taxonomyReconciliation';

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get('tenantId')?.trim() || 'default';
  await connectDB();
  const usage = await Vibe.aggregate([
    { $match: { tenantId, status: { $ne: 'trash' } } },
    { $unwind: '$taxonomyTermIds' },
    { $group: { _id: '$taxonomyTermIds', count: { $sum: 1 } } },
  ]);
  const counts = Object.fromEntries(usage.map(({ _id, count }: { _id: string; count: number }) => [_id, count]));
  const compareReads = process.env.VIBE_TAXONOMY_COMPARE_READS === '1';
  const normalizedRead = process.env.VIBE_TAXONOMY_NORMALIZED_READ === '1';
  let normalizedCounts: Record<string, number> | null = null;
  if (compareReads || normalizedRead) {
    normalizedCounts = await countNormalizedTaxonomyUsage(tenantId);
  }
  if (compareReads && normalizedCounts) {
    const reconciliation = buildTaxonomyReconciliationReport({ tenantId, embeddedCounts: counts, normalizedCounts });
    if (reconciliation.state === 'mismatch') console.warn('VIBE_TAXONOMY_READ_MISMATCH', reconciliation);
  }
  return NextResponse.json({ terms: listVibeTaxonomyTerms(), counts: normalizedRead && normalizedCounts ? normalizedCounts : counts });
}
