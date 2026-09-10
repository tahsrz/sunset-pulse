import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/core/database';
import { publishCmsPageRevision } from '@/lib/cms/pages/pageService';
import { isAuthResponse, operatorAuditUser, requireOperatorRouteAccess } from '@/lib/core/routeAuth';

export const dynamic = 'force-dynamic';
const publishSchema = z.object({ expectedVersion: z.number().int().nonnegative().optional(), changeSummary: z.string().trim().max(1_000).optional() }).strict();

export async function POST(request: NextRequest, context: { params: Promise<{ pageId: string }> }) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const siteId = request.nextUrl.searchParams.get('siteId')?.trim();
  if (!siteId) return NextResponse.json({ error: 'siteId is required.' }, { status: 400 });
  const parsed = publishSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid publication request.', issues: parsed.error.flatten() }, { status: 400 });
  const { pageId } = await context.params;
  try {
    await connectDB();
    const revision = await publishCmsPageRevision({
      tenantId: request.nextUrl.searchParams.get('tenantId')?.trim() || 'default',
      siteId,
      pageId,
      actorId: operatorAuditUser(access).userId,
      expectedVersion: parsed.data.expectedVersion,
      changeSummary: parsed.data.changeSummary,
    });
    return NextResponse.json({ revision }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'CMS_PAGE_NOT_FOUND') return NextResponse.json({ error: 'Page not found.' }, { status: 404 });
    if (message === 'CMS_PAGE_DRAFT_CONFLICT') return NextResponse.json({ error: 'Page changed since it was loaded.', code: message }, { status: 409 });
    return NextResponse.json({ error: 'Page could not be published.' }, { status: 400 });
  }
}
