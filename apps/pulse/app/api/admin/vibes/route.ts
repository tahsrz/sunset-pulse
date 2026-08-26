import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/core/database';
import Vibe from '@/models/Vibe';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;

  await connectDB();
  const params = request.nextUrl.searchParams;
  const tenantId = params.get('tenantId')?.trim() || 'default';
  const status = params.get('status')?.trim();
  const search = params.get('search')?.trim();
  const page = Math.max(1, Number(params.get('page') || 1));
  const pageSize = Math.min(100, Math.max(1, Number(params.get('pageSize') || 25)));
  const filter: Record<string, unknown> = { tenantId };
  if (status) filter.status = status;
  if (search) filter.$or = [
    { title: { $regex: escapeRegex(search), $options: 'i' } },
    { slug: { $regex: escapeRegex(search), $options: 'i' } },
  ];

  const [vibes, total] = await Promise.all([
    Vibe.find(filter)
      .select('vibeId title name slug status tenantId publishedRevisionId authorId updatedBy updatedAt createdAt taxonomyTermIds')
      .sort({ updatedAt: -1, title: 1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    Vibe.countDocuments(filter),
  ]);

  return NextResponse.json({ vibes, page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
