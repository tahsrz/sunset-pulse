import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthResponse, requireSignedInUser } from '@/lib/core/routeAuth';
import { requireWorkspaceAccess, WorkspaceAccessError } from '@/lib/platform/access/workspaceAccess.server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const requestSchema = z.object({
  workspaceId: z.string().uuid(),
  briefId: z.string().uuid(),
  revision: z.number().int().positive().safe(),
  requestKey: z.string().uuid(),
}).strict();

export async function POST(request: NextRequest) {
  const access = await requireSignedInUser(request);
  if (isAuthResponse(access)) return access;
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid seller video review request.' }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } });

  try {
    await requireWorkspaceAccess(access.user.id, parsed.data.workspaceId, 'workflow:run');
    const { data, error } = await supabaseAdmin.rpc('platform_start_seller_video_review', {
      p_actor_id: access.user.id,
      p_workspace_id: parsed.data.workspaceId,
      p_brief_id: parsed.data.briefId,
      p_revision: parsed.data.revision,
      p_request_key: parsed.data.requestKey,
    });
    if (error) {
      const status = error.code === '42501' ? 403 : error.code === 'P0002' ? 404 : error.code === '40001' || error.code === '23505' ? 409 : error.code === '22023' ? 400 : error.code === '55000' ? 503 : 500;
      return NextResponse.json({ ok: false, error: status === 500 ? 'Unable to request seller video review.' : error.message }, { status, headers: { 'Cache-Control': 'private, no-store' } });
    }
    const run = Array.isArray(data) ? data[0] : data;
    if (!run?.id) return NextResponse.json({ ok: false, error: 'Review workflow returned no run.' }, { status: 500, headers: { 'Cache-Control': 'private, no-store' } });
    return NextResponse.json({ ok: true, run }, { status: 202, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      const status = error.code === 'INVALID' ? 400 : error.code === 'FORBIDDEN' ? 403 : 404;
      return NextResponse.json({ ok: false, error: error.message }, { status, headers: { 'Cache-Control': 'private, no-store' } });
    }
    return NextResponse.json({ ok: false, error: 'Unable to request seller video review.' }, { status: 500, headers: { 'Cache-Control': 'private, no-store' } });
  }
}
