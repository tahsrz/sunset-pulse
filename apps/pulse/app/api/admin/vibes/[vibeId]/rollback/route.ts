import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/core/database';
import VibeRevision from '@/models/VibeRevision';
import { isAuthResponse, operatorAuditUser, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { publishVibeRevision } from '@/lib/cms/vibeService';
import { vibeDraftSchema } from '@/lib/cms/vibeSchema';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: { params: Promise<{ vibeId: string }> }) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const { vibeId } = await context.params;
  const tenantId = request.nextUrl.searchParams.get('tenantId')?.trim() || 'default';
  const body = await request.json().catch(() => null) as { revisionId?: string; reason?: string } | null;
  if (!body?.revisionId || !body.reason?.trim()) return NextResponse.json({ error: 'revisionId and rollback reason are required.' }, { status: 400 });
  await connectDB();
  const revision = await VibeRevision.findOne({ _id: body.revisionId, vibeId, tenantId }).lean() as any;
  if (!revision) return NextResponse.json({ error: 'Revision not found.' }, { status: 404 });
  try {
    const created = await publishVibeRevision({
      vibeId,
      tenantId,
      draft: vibeDraftSchema.parse(revision.snapshot),
      actorId: operatorAuditUser(access).userId,
      changeSummary: `Rollback to revision ${revision.revisionNumber}: ${body.reason.trim()}`,
    });
    return NextResponse.json({ revision: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Rollback could not be completed.' }, { status: 409 });
  }
}
