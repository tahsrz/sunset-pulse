import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/core/database';
import { restoreCmsPage } from '@/lib/cms/pages/pageService';
import { isAuthResponse, operatorAuditUser, requireOperatorRouteAccess } from '@/lib/core/routeAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: { params: Promise<{ pageId: string }> }) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const siteId = request.nextUrl.searchParams.get('siteId')?.trim();
  if (!siteId) return NextResponse.json({ error: 'siteId is required.' }, { status: 400 });
  const { pageId } = await context.params;
  try {
    await connectDB();
    const page = await restoreCmsPage({ tenantId: request.nextUrl.searchParams.get('tenantId')?.trim() || 'default', siteId, pageId, actorId: operatorAuditUser(access).userId });
    return NextResponse.json({ page });
  } catch {
    return NextResponse.json({ error: 'Page not found.' }, { status: 404 });
  }
}
