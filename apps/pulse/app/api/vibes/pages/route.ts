import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/core/database';
import { isAuthResponse, operatorAuditUser, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { createCmsPage, listCmsPages } from '@/lib/cms/pages/pageService';

export const dynamic = 'force-dynamic';

const createPageSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  parentPageId: z.string().trim().min(1).max(200).optional(),
}).strict();

export async function GET(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const siteId = request.nextUrl.searchParams.get('siteId')?.trim();
  if (!siteId) return NextResponse.json({ error: 'siteId is required.' }, { status: 400 });
  const tenantId = request.nextUrl.searchParams.get('tenantId')?.trim() || 'default';
  const rawStatus = request.nextUrl.searchParams.get('status');
  const status = z.enum(['draft', 'published', 'trash']).safeParse(rawStatus);
  if (rawStatus && !status.success) return NextResponse.json({ error: 'Invalid page status.' }, { status: 400 });
  const page = Math.max(1, Number(request.nextUrl.searchParams.get('page') || 1));
  const pageSize = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get('pageSize') || 25)));
  await connectDB();
  const result = await listCmsPages({
    tenantId,
    siteId,
    status: status.success ? status.data : undefined,
    search: request.nextUrl.searchParams.get('search')?.trim().slice(0, 200),
    page: Number.isFinite(page) ? page : 1,
    pageSize: Number.isFinite(pageSize) ? pageSize : 25,
  });
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const siteId = request.nextUrl.searchParams.get('siteId')?.trim();
  if (!siteId) return NextResponse.json({ error: 'siteId is required.' }, { status: 400 });
  const parsed = createPageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid page identity.', issues: parsed.error.flatten() }, { status: 400 });
  try {
    await connectDB();
    const page = await createCmsPage({
      tenantId: request.nextUrl.searchParams.get('tenantId')?.trim() || 'default',
      siteId,
      title: parsed.data.title,
      slug: parsed.data.slug,
      parentPageId: parsed.data.parentPageId,
      actorId: operatorAuditUser(access).userId,
    });
    return NextResponse.json({ page }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 11000) return NextResponse.json({ error: 'A page already uses that path on this site.' }, { status: 409 });
    if (error instanceof Error && error.message === 'CMS_PAGE_PARENT_NOT_FOUND') return NextResponse.json({ error: 'Parent page not found.' }, { status: 404 });
    if (error instanceof Error && error.message === 'CMS_PAGE_HOME_CANNOT_BE_PARENT') return NextResponse.json({ error: 'The home page cannot be used as a parent.' }, { status: 409 });
    if (error instanceof Error && error.message === 'CMS_PAGE_PATH_INVALID') return NextResponse.json({ error: 'Page paths may contain at most eight segments and 500 characters.' }, { status: 400 });
    return NextResponse.json({ error: 'Page could not be created.' }, { status: 400 });
  }
}
