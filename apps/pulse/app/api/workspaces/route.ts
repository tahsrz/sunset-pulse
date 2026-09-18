import { NextRequest, NextResponse } from 'next/server';
import { isAuthResponse, requireSignedInUser } from '@/lib/core/routeAuth';
import { WorkspaceAccessError, createWorkspace, listAccessibleWorkspaces } from '@/lib/platform/access/workspaceAccess.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function errorResponse(error: unknown) {
  if (error instanceof WorkspaceAccessError) {
    const status = error.code === 'INVALID' ? 400 : error.code === 'FORBIDDEN' ? 403 : 404;
    return NextResponse.json({ ok: false, error: error.message }, { status, headers: { 'Cache-Control': 'private, no-store' } });
  }
  return NextResponse.json({ ok: false, error: 'Unable to process workspace request.' }, { status: 500, headers: { 'Cache-Control': 'private, no-store' } });
}

export async function GET(request: NextRequest) {
  const access = await requireSignedInUser(request);
  if (isAuthResponse(access)) return access;
  try {
    const workspaces = await listAccessibleWorkspaces(access.user.id);
    return NextResponse.json({ ok: true, workspaces }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const access = await requireSignedInUser(request);
  if (isAuthResponse(access)) return access;
  try {
    const body = await request.json().catch(() => null);
    const result = await createWorkspace(access.user.id, body);
    return NextResponse.json({ ok: true, ...result }, { status: result.reused ? 200 : 201, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return errorResponse(error);
  }
}
