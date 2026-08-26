import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/core/database';
import { SiteConfig } from '@/models/SiteConfig';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { readPublishedVibeProjection } from '@/lib/cms/vibeService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: Promise<{ siteId: string }> }) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const { siteId } = await context.params;
  await connectDB();
  const site = await SiteConfig.findOne({ agentId: siteId }).select('agentId activeVibeRevisionId').lean() as any;
  if (!site) return NextResponse.json({ error: 'Site not found.' }, { status: 404 });
  if (!site.activeVibeRevisionId) return NextResponse.json({ siteId, revision: null });
  const revision = await readPublishedVibeProjection({ revisionId: site.activeVibeRevisionId, tenantId: request.nextUrl.searchParams.get('tenantId')?.trim() || 'default' });
  if (!revision) return NextResponse.json({ error: 'Applied vibe revision is unavailable.' }, { status: 409 });
  return NextResponse.json({ siteId, revision });
}
