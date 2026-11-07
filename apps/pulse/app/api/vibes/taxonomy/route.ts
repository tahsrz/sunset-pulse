import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/core/database';
import Vibe from '@/models/Vibe';
import { listVibeTaxonomyTerms } from '@/lib/cms/taxonomy';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';

export async function GET(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const tenantId = request.nextUrl.searchParams.get('tenantId')?.trim() || 'default';
  await connectDB();
  const usage = await Vibe.aggregate([
    { $match: { tenantId, status: { $ne: 'trash' } } },
    { $unwind: '$taxonomyTermIds' },
    { $group: { _id: '$taxonomyTermIds', count: { $sum: 1 } } },
  ]);
  const counts = Object.fromEntries(usage.map(({ _id, count }: { _id: string; count: number }) => [_id, count]));
  return NextResponse.json({ terms: listVibeTaxonomyTerms(), counts });
}
