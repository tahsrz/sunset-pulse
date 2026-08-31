import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/core/database';
import { isAuthResponse, operatorAuditUser, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { submitVibeRevision } from '@/lib/cms/vibeService';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: { params: Promise<{ vibeId: string }> }) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const { vibeId } = await context.params;
  const tenantId = request.nextUrl.searchParams.get('tenantId')?.trim() || 'default';
  await connectDB();
  try {
    const revision = await submitVibeRevision({ vibeId, tenantId, actorId: operatorAuditUser(access).userId });
    return NextResponse.json({ revision }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'VIBE_NOT_FOUND') return NextResponse.json({ error: 'Vibe not found.' }, { status: 404 });
    if (code === 'INVALID_TRANSITION') return NextResponse.json({ error: 'Only draft vibes can be submitted.', code }, { status: 409 });
    return NextResponse.json({ error: 'Vibe could not be submitted.' }, { status: 400 });
  }
}
