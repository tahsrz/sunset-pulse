import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/core/database';
import Vibe from '@/models/Vibe';
import { isAuthResponse, operatorAuditUser, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { publishVibeRevision } from '@/lib/cms/vibeService';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: { params: Promise<{ vibeId: string }> }) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const { vibeId } = await context.params;
  const tenantId = request.nextUrl.searchParams.get('tenantId')?.trim() || 'default';
  const body = await request.json().catch(() => null) as { changeSummary?: string } | null;
  const parsed = publishInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid publication request.', issues: parsed.error.flatten() }, { status: 400 });
  try {
    await connectDB();
    const vibe = await Vibe.findOne({ vibeId, tenantId }).select('status submittedRevisionId').lean() as any;
    if (!vibe) return NextResponse.json({ error: 'Vibe not found.' }, { status: 404 });
    if (vibe.status !== 'in_review') return NextResponse.json({ error: 'Only vibes in review can be published.', code: 'INVALID_TRANSITION' }, { status: 409 });
    const revision = await publishVibeRevision({
      vibeId,
      tenantId,
      submittedRevisionId: String(vibe.submittedRevisionId || ''),
      actorId: operatorAuditUser(access).userId,
      changeSummary: parsed.data.changeSummary,
    });
    return NextResponse.json({ revision }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'VIBE_NOT_FOUND') return NextResponse.json({ error: 'Vibe not found.' }, { status: 404 });
    if (message === 'INVALID_SUBMITTED_REVISION') return NextResponse.json({ error: 'The submitted revision is no longer available for publication.', code: 'INVALID_TRANSITION' }, { status: 409 });
    return NextResponse.json({ error: 'Vibe cannot be published.', details: message === 'VIBE_NOT_FOUND' ? undefined : 'Draft validation or publication failed.' }, { status: 400 });
  }
}

const publishInputSchema = z.object({
  changeSummary: z.string().trim().max(1_000).optional(),
}).strict();
