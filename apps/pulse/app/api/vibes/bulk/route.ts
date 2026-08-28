import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import connectDB from '@/lib/core/database';
import Vibe from '@/models/Vibe';
import VibeAuditEvent from '@/models/VibeAuditEvent';
import { isAuthResponse, operatorAuditUser, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { transitionVibe } from '@/lib/cms/vibeWorkflow';

const schema = z.object({ vibeIds: z.array(z.string().trim().min(1)).min(1).max(50), action: z.enum(['archive', 'trash']) }).strict();

export async function POST(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request); if (isAuthResponse(access)) return access;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Select 1–50 Vibes and a supported bulk action.' }, { status: 400 });
  const tenantId = request.nextUrl.searchParams.get('tenantId')?.trim() || 'default'; const actorId = operatorAuditUser(access).userId;
  await connectDB(); const vibes = await Vibe.find({ vibeId: { $in: parsed.data.vibeIds }, tenantId }).select('vibeId status').lean() as any[];
  if (vibes.length !== parsed.data.vibeIds.length) return NextResponse.json({ error: 'One or more selected Vibes no longer exist.' }, { status: 409 });
  const invalid = vibes.find((vibe) => !transitionVibe({ status: vibe.status || 'draft', action: parsed.data.action }).ok);
  if (invalid) return NextResponse.json({ error: `Cannot ${parsed.data.action} ${invalid.vibeId} from its current status.` }, { status: 409 });
  const session = await mongoose.startSession();
  try { await session.withTransaction(async () => {
    const now = new Date();
    const result = await Vibe.bulkWrite(vibes.map((vibe) => ({ updateOne: { filter: { vibeId: vibe.vibeId, tenantId, status: vibe.status || 'draft' }, update: parsed.data.action === 'archive' ? { $set: { status: 'archived', archivedAt: now, updatedAt: now, updatedBy: actorId } } : { $set: { status: 'trash', migrationMetadata: { lastNonTrashStatus: vibe.status || 'draft', trashedBy: actorId, trashedAt: now.toISOString() }, updatedAt: now, updatedBy: actorId } } } })), { session });
    if (result.matchedCount !== vibes.length) throw new Error('VIBES_CHANGED_BEFORE_BULK_ACTION');
    await VibeAuditEvent.create(vibes.map((vibe) => ({ vibeId: vibe.vibeId, tenantId, action: parsed.data.action === 'archive' ? 'archived' : 'trashed', actorId })), { session });
  }); } finally { await session.endSession(); }
  return NextResponse.json({ updated: vibes.length });
}
