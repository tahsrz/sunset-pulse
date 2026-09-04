import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/core/database';
import { cmsPageDraftSchema } from '@/lib/cms/pages/pageSchema';
import { readCmsPagePreview, saveCmsPageDraft } from '@/lib/cms/pages/pageService';
import { isAuthResponse, operatorAuditUser, requireOperatorRouteAccess } from '@/lib/core/routeAuth';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ pageId: string }> };
const updateSchema = z.object({ draft: cmsPageDraftSchema, expectedVersion: z.number().int().nonnegative().optional() }).strict();

export async function GET(request: NextRequest, context: Context) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const siteId = request.nextUrl.searchParams.get('siteId')?.trim();
  if (!siteId) return NextResponse.json({ error: 'siteId is required.' }, { status: 400 });
  const { pageId } = await context.params;
  await connectDB();
  const page = await readCmsPagePreview({ tenantId: request.nextUrl.searchParams.get('tenantId')?.trim() || 'default', siteId, pageId });
  if (!page) return NextResponse.json({ error: 'Page not found.' }, { status: 404 });
  return NextResponse.json({ page });
}

export async function PATCH(request: NextRequest, context: Context) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const siteId = request.nextUrl.searchParams.get('siteId')?.trim();
  if (!siteId) return NextResponse.json({ error: 'siteId is required.' }, { status: 400 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid page draft.', issues: parsed.error.flatten() }, { status: 400 });
  const { pageId } = await context.params;
  try {
    await connectDB();
    const page = await saveCmsPageDraft({
      tenantId: request.nextUrl.searchParams.get('tenantId')?.trim() || 'default',
      siteId,
      pageId,
      draft: parsed.data.draft,
      expectedVersion: parsed.data.expectedVersion,
      actorId: operatorAuditUser(access).userId,
    });
    return NextResponse.json({ page });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'CMS_PAGE_NOT_FOUND') return NextResponse.json({ error: 'Page not found.' }, { status: 404 });
    if (message === 'CMS_PAGE_DRAFT_CONFLICT') return NextResponse.json({ error: 'Page changed since it was loaded.', code: message }, { status: 409 });
    if (message === 'CMS_PAGE_PATH_CHANGE_REQUIRES_MOVE') return NextResponse.json({ error: 'Move or rename the page through the page hierarchy controls.', code: message }, { status: 409 });
    return NextResponse.json({ error: 'Page draft could not be saved.' }, { status: 400 });
  }
}
