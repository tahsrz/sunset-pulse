import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/core/database';
import VibeRevision from '@/models/VibeRevision';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: Promise<{ vibeId: string }> }) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const { vibeId } = await context.params;
  const params = request.nextUrl.searchParams;
  const from = params.get('from');
  const to = params.get('to');
  const tenantId = params.get('tenantId')?.trim() || 'default';
  if (!from || !to) return NextResponse.json({ error: 'from and to revision IDs are required.' }, { status: 400 });
  await connectDB();
  const revisions = await VibeRevision.find({ _id: { $in: [from, to] }, vibeId, tenantId }).select('revisionNumber snapshot createdAt createdBy contentHash').lean();
  if (revisions.length !== 2) return NextResponse.json({ error: 'Both revisions must exist for this vibe.' }, { status: 404 });
  const fromRevision = revisions.find((revision: any) => String(revision._id) === from);
  const toRevision = revisions.find((revision: any) => String(revision._id) === to);
  return NextResponse.json({ from: fromRevision, to: toRevision, changes: diffSnapshots((fromRevision as any).snapshot, (toRevision as any).snapshot) });
}

function diffSnapshots(from: unknown, to: unknown, path = ''): Array<{ path: string; from?: unknown; to?: unknown }> {
  if (Object.is(from, to)) return [];
  if (Array.isArray(from) || Array.isArray(to)) {
    if (!Array.isArray(from) || !Array.isArray(to)) return [{ path: path || '$', from, to }];
    const length = Math.max(from.length, to.length);
    return Array.from({ length }).flatMap((_, index) => diffSnapshots(from[index], to[index], `${path}[${index}]`));
  }
  if (!from || !to || typeof from !== 'object' || typeof to !== 'object') {
    return [{ path: path || '$', from, to }];
  }
  const keys = new Set([...Object.keys(from as object), ...Object.keys(to as object)]);
  return Array.from(keys).flatMap((key) => diffSnapshots((from as any)[key], (to as any)[key], path ? `${path}.${key}` : key));
}
