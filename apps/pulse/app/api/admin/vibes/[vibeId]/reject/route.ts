import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/core/database';
import Vibe from '@/models/Vibe';
import { isAuthResponse, operatorAuditUser, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { transitionVibe } from '@/lib/cms/vibeWorkflow';
import { z } from 'zod';
import VibeAuditEvent from '@/models/VibeAuditEvent';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: { params: Promise<{ vibeId: string }> }) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const { vibeId } = await context.params;
  const body = rejectSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: 'A rejection reason is required.' }, { status: 400 });
  const tenantId = request.nextUrl.searchParams.get('tenantId')?.trim() || 'default';
  await connectDB();
  const vibe = await Vibe.findOne({ vibeId, tenantId }).select('status').lean() as any;
  if (!vibe) return NextResponse.json({ error: 'Vibe not found.' }, { status: 404 });
  const transition = transitionVibe({ status: vibe.status || 'draft', action: 'reject', rejectionReason: body.data.reason });
  if (!transition.ok) return NextResponse.json({ error: transition.message, code: transition.code }, { status: 409 });
  const updated = await Vibe.findOneAndUpdate({ vibeId, tenantId, status: vibe.status || 'draft' }, { $set: { status: 'draft', updatedBy: operatorAuditUser(access).userId, updatedAt: new Date(), 'migrationMetadata.lastRejectionReason': body.data.reason } }, { new: true }).lean();
  if (!updated) return NextResponse.json({ error: 'Vibe changed before rejection.' }, { status: 409 });
  await VibeAuditEvent.create({ vibeId, tenantId, action: 'rejected', actorId: operatorAuditUser(access).userId, reason: body.data.reason });
  return NextResponse.json({ vibe: updated });
}

const rejectSchema = z.object({ reason: z.string().trim().min(3).max(1_000) }).strict();
