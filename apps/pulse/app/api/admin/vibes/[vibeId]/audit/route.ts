import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/core/database';
import VibeAuditEvent from '@/models/VibeAuditEvent';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: Promise<{ vibeId: string }> }) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const { vibeId } = await context.params;
  const tenantId = request.nextUrl.searchParams.get('tenantId')?.trim() || 'default';
  await connectDB();
  const events = await VibeAuditEvent.find({ vibeId, tenantId })
    .sort({ occurredAt: -1 })
    .limit(100)
    .lean();
  return NextResponse.json({ events });
}
