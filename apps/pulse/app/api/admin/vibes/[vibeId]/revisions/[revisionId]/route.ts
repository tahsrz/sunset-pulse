import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/core/database';
import VibeRevision from '@/models/VibeRevision';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: Promise<{ vibeId: string; revisionId: string }> }) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const { vibeId, revisionId } = await context.params;
  const tenantId = request.nextUrl.searchParams.get('tenantId')?.trim() || 'default';
  await connectDB();
  const revision = await VibeRevision.findOne({ _id: revisionId, vibeId, tenantId }).lean();
  if (!revision) return NextResponse.json({ error: 'Revision not found.' }, { status: 404 });
  return NextResponse.json({ revision });
}
