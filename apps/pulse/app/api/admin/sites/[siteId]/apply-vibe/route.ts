import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/core/database';
import { isAuthResponse, operatorAuditUser, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { applyVibeRevisionToSite } from '@/lib/cms/vibeService';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: { params: Promise<{ siteId: string }> }) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const { siteId } = await context.params;
  const tenantId = request.nextUrl.searchParams.get('tenantId')?.trim() || 'default';
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'revisionId is required.' }, { status: 400 });
  try {
    await connectDB();
    const site = await applyVibeRevisionToSite({ siteId, tenantId, revisionId: parsed.data.revisionId, actorId: operatorAuditUser(access).userId });
    return NextResponse.json({ site });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'SITE_NOT_FOUND') return NextResponse.json({ error: 'Site not found.' }, { status: 404 });
    if (code === 'PUBLISHED_REVISION_NOT_FOUND') return NextResponse.json({ error: 'Only a published revision can be applied.' }, { status: 409 });
    return NextResponse.json({ error: 'Vibe could not be applied.' }, { status: 400 });
  }
}

const inputSchema = z.object({ revisionId: z.string().trim().min(1).max(120) }).strict();
