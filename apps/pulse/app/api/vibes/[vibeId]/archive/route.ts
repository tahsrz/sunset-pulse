import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/core/database';
import Vibe from '@/models/Vibe';
import { isAuthResponse, operatorAuditUser, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { transitionVibe } from '@/lib/cms/vibeWorkflow';
import VibeAuditEvent from '@/models/VibeAuditEvent';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: { params: Promise<{ vibeId: string }> }) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const { vibeId } = await context.params;
  const tenantId = request.nextUrl.searchParams.get('tenantId')?.trim() || 'default';
  await connectDB();
  const vibe = await Vibe.findOne({ vibeId, tenantId }).select('status').lean() as any;
  if (!vibe) return NextResponse.json({ error: 'Vibe not found.' }, { status: 404 });
  const transition = transitionVibe({ status: vibe.status || 'draft', action: 'archive' });
  if (!transition.ok) return NextResponse.json({ error: transition.message, code: transition.code }, { status: 409 });
  const session = await mongoose.startSession();
  let updated;
  try {
    await session.withTransaction(async () => {
      updated = await Vibe.findOneAndUpdate({ vibeId, tenantId, status: vibe.status || 'draft' }, { $set: { status: 'archived', archivedAt: new Date(), updatedBy: operatorAuditUser(access).userId, updatedAt: new Date() } }, { new: true, session }).lean();
      if (!updated) throw new Error('VIBE_CHANGED_BEFORE_ARCHIVING');
      await VibeAuditEvent.create([{ vibeId, tenantId, action: 'archived', actorId: operatorAuditUser(access).userId }], { session });
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'VIBE_CHANGED_BEFORE_ARCHIVING') return NextResponse.json({ error: 'Vibe changed before archiving.' }, { status: 409 });
    throw error;
  } finally { await session.endSession(); }
  return NextResponse.json({ vibe: updated });
}
