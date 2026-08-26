import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/core/database';
import Vibe from '@/models/Vibe';
import { isAuthResponse, operatorAuditUser, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { transitionVibe } from '@/lib/cms/vibeWorkflow';

export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest, context: { params: Promise<{ vibeId: string }> }) {
  const access = await requireOperatorRouteAccess(request); if (isAuthResponse(access)) return access;
  const { vibeId } = await context.params; const tenantId = request.nextUrl.searchParams.get('tenantId')?.trim() || 'default'; await connectDB();
  const vibe = await Vibe.findOne({ vibeId, tenantId }).select('status migrationMetadata').lean() as any;
  if (!vibe) return NextResponse.json({ error: 'Vibe not found.' }, { status: 404 });
  const transition = transitionVibe({ status: 'trash', action: 'restore' });
  if (!transition.ok) return NextResponse.json({ error: transition.message, code: transition.code }, { status: 409 });
  const restoredStatus = vibe.migrationMetadata?.lastNonTrashStatus || 'draft';
  const updated = await Vibe.findOneAndUpdate({ vibeId, tenantId, status: 'trash' }, { $set: { status: restoredStatus, updatedBy: operatorAuditUser(access).userId, updatedAt: new Date() } }, { new: true }).lean();
  if (!updated) return NextResponse.json({ error: 'Vibe changed before restoration.' }, { status: 409 });
  return NextResponse.json({ vibe: updated });
}
