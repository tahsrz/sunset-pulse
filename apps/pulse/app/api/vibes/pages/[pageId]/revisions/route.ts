import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectDB from '@/lib/core/database';
import { listCmsPageRevisions, restoreCmsPageRevision } from '@/lib/cms/pages/pageService';
import { isAuthResponse, operatorAuditUser, requireOperatorRouteAccess } from '@/lib/core/routeAuth';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ pageId: string }> };
const restoreSchema = z.object({ revisionId: z.string().trim().min(1), expectedVersion: z.number().int().nonnegative() }).strict();

export async function GET(request: NextRequest, context: Context) {
  const access = await requireOperatorRouteAccess(request); if (isAuthResponse(access)) return access;
  const siteId = request.nextUrl.searchParams.get('siteId')?.trim(); if (!siteId) return NextResponse.json({ error: 'siteId is required.' }, { status: 400 });
  const { pageId } = await context.params; await connectDB();
  const revisions = await listCmsPageRevisions({ tenantId: request.nextUrl.searchParams.get('tenantId')?.trim() || 'default', siteId, pageId, limit: Number(request.nextUrl.searchParams.get('limit')) || 20 });
  return NextResponse.json({ revisions });
}

export async function POST(request: NextRequest, context: Context) {
  const access = await requireOperatorRouteAccess(request); if (isAuthResponse(access)) return access;
  const siteId = request.nextUrl.searchParams.get('siteId')?.trim(); if (!siteId) return NextResponse.json({ error: 'siteId is required.' }, { status: 400 });
  const parsed = restoreSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: 'Invalid revision restore request.' }, { status: 400 });
  const { pageId } = await context.params;
  try { await connectDB(); const page = await restoreCmsPageRevision({ tenantId: request.nextUrl.searchParams.get('tenantId')?.trim() || 'default', siteId, pageId, revisionId: parsed.data.revisionId, expectedVersion: parsed.data.expectedVersion, actorId: operatorAuditUser(access).userId }); return NextResponse.json({ page }); }
  catch (error) { const code = error instanceof Error ? error.message : ''; if (code === 'CMS_PAGE_REVISION_NOT_FOUND') return NextResponse.json({ error: 'Revision not found.', code }, { status: 404 }); if (code === 'CMS_PAGE_DRAFT_CONFLICT') return NextResponse.json({ error: 'Page changed since it was loaded.', code }, { status: 409 }); return NextResponse.json({ error: 'Revision could not be restored.' }, { status: 400 }); }
}
