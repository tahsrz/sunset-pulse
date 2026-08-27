import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/core/database';
import Vibe from '@/models/Vibe';
import { isAuthResponse, operatorAuditUser, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { saveVibeDraft } from '@/lib/cms/vibeService';
import { vibeDraftSchema } from '@/lib/cms/vibeSchema';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: Promise<{ vibeId: string }> }) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const { vibeId } = await context.params;
  const tenantId = request.nextUrl.searchParams.get('tenantId')?.trim() || 'default';
  await connectDB();
  const vibe = await Vibe.findOne({ vibeId, tenantId }).lean();
  if (!vibe) return NextResponse.json({ error: 'Vibe not found.' }, { status: 404 });
  return NextResponse.json({ vibe });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ vibeId: string }> }) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const { vibeId } = await context.params;
  const tenantId = request.nextUrl.searchParams.get('tenantId')?.trim() || 'default';
  const body = await request.json().catch(() => null);
  const parsed = draftInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid draft payload.', issues: parsed.error.flatten() }, { status: 400 });
  try {
    await connectDB();
    const vibe = await saveVibeDraft({
      vibeId,
      tenantId,
      draft: parsed.data.draft,
      actorId: operatorAuditUser(access).userId,
      expectedVersion: parsed.data.expectedVersion,
    });
    return NextResponse.json({ vibe });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Draft update failed.';
    if (message === 'VIBE_NOT_FOUND') return NextResponse.json({ error: 'Vibe not found.' }, { status: 404 });
    if (message === 'VIBE_DRAFT_CONFLICT') return NextResponse.json({ error: 'Draft changed since it was loaded.', code: message }, { status: 409 });
    return NextResponse.json({ error: 'Draft update failed.' }, { status: 400 });
  }
}

const draftInputSchema = z.object({
  draft: vibeDraftSchema,
  expectedVersion: z.number().int().nonnegative().optional(),
}).strict();
