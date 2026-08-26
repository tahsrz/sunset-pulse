import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/core/database';
import Vibe from '@/models/Vibe';
import VibeRevision from '@/models/VibeRevision';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: Promise<{ vibeId: string }> }) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const { vibeId } = await context.params;
  const tenantId = request.nextUrl.searchParams.get('tenantId')?.trim() || 'default';
  const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get('limit') || 25)));
  await connectDB();
  const vibe = await Vibe.findOne({ vibeId, tenantId }).select('vibeId publishedRevisionId status').lean();
  if (!vibe) return NextResponse.json({ error: 'Vibe not found.' }, { status: 404 });
  const revisions = await VibeRevision.find({ vibeId, tenantId })
    .select('vibeId tenantId revisionNumber parentRevisionId changeSummary createdBy createdAt publishedAt publishedBy contentHash')
    .sort({ revisionNumber: -1 })
    .limit(limit)
    .lean();
  return NextResponse.json({ revisions, publishedRevisionId: vibe.publishedRevisionId || null });
}
