import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/core/database';
import { readCmsPagePreview } from '@/lib/cms/pages/pageService';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: Promise<{ pageId: string }> }) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const siteId = request.nextUrl.searchParams.get('siteId')?.trim();
  if (!siteId) return NextResponse.json({ error: 'siteId is required.' }, { status: 400 });
  const { pageId } = await context.params;
  await connectDB();
  const preview = await readCmsPagePreview({ tenantId: request.nextUrl.searchParams.get('tenantId')?.trim() || 'default', siteId, pageId });
  if (!preview) return NextResponse.json({ error: 'Page not found.' }, { status: 404 });
  return NextResponse.json({ preview });
}
