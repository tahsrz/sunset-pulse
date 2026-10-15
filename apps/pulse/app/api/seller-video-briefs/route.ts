import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthResponse, requireSignedInUser } from '@/lib/core/routeAuth';
import { supabaseAdmin } from '@/lib/supabase';
import { requireWorkspaceAccess, WorkspaceAccessError } from '@/lib/platform/access/workspaceAccess.server';
import { videoBriefSchema } from '@/lib/marketing/videoBriefSchema';
import { readSellerVideoJson } from '@/lib/marketing/sellerVideoRouteBody.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const workspaceIdSchema = z.string().uuid();
const saveRequestSchema = z.object({
  workspaceId: workspaceIdSchema,
  brief: videoBriefSchema,
}).strict();

function responseError(error: unknown) {
  if (error instanceof WorkspaceAccessError) {
    const status = error.code === 'INVALID' ? 400 : error.code === 'FORBIDDEN' ? 403 : 404;
    return NextResponse.json({ ok: false, error: error.message }, { status, headers: { 'Cache-Control': 'private, no-store' } });
  }
  return NextResponse.json({ ok: false, error: 'Unable to process seller video brief.' }, { status: 500, headers: { 'Cache-Control': 'private, no-store' } });
}

export async function GET(request: NextRequest) {
  const access = await requireSignedInUser(request);
  if (isAuthResponse(access)) return access;
  const workspaceId = request.nextUrl.searchParams.get('workspaceId');
  if (!workspaceIdSchema.safeParse(workspaceId).success) {
    return NextResponse.json({ ok: false, error: 'A valid workspaceId is required.' }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } });
  }
  const briefId = request.nextUrl.searchParams.get('briefId');
  const revisionText = request.nextUrl.searchParams.get('revision');
  const targeted = briefId !== null || revisionText !== null;
  const target = targeted ? z.object({ briefId: z.string().uuid(), revision: z.coerce.number().int().positive().safe() }).strict().safeParse({ briefId, revision: revisionText }) : null;
  if (targeted && !target?.success) {
    return NextResponse.json({ ok: false, error: 'briefId and a positive revision must be provided together.' }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } });
  }
  try {
    await requireWorkspaceAccess(access.user.id, workspaceId!, 'artifact:read');
    const { data, error } = await supabaseAdmin.from('seller_video_briefs')
      .select('workspace_id,owner_id,brief_id,revision,backlog_item_id,backlog_item_revision,brief_data,created_at')
      .eq('workspace_id', workspaceId!)
      .match(target?.success ? { brief_id: target.data.briefId, revision: target.data.revision } : {})
      .order('created_at', { ascending: false })
      .limit(target?.success ? 1 : 100);
    if (error) throw error;
    return NextResponse.json({ ok: true, briefs: data || [] }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: NextRequest) {
  const access = await requireSignedInUser(request);
  if (isAuthResponse(access)) return access;
  const { body, response } = await readSellerVideoJson(request, 'Seller video draft request rejected');
  if (response) return response;
  const parsed = saveRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid seller video brief draft.', details: parsed.error.flatten() }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } });
  if (parsed.data.brief.reviewStatus !== 'draft' || parsed.data.brief.reviewedByUserId || parsed.data.brief.reviewedAt) {
    return NextResponse.json({ ok: false, error: 'Only unreviewed draft briefs can be saved here.' }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } });
  }
  try {
    await requireWorkspaceAccess(access.user.id, parsed.data.workspaceId, 'workflow:run');
    const { data, error } = await supabaseAdmin.rpc('platform_save_seller_video_brief', {
      p_actor_id: access.user.id,
      p_workspace_id: parsed.data.workspaceId,
      p_brief: parsed.data.brief,
    });
    if (error) {
      const status = error.code === '42501' ? 403 : error.code === 'P0002' ? 404 : error.code === '40001' || error.code === '23505' ? 409 : error.code === '22023' ? 400 : 500;
      return NextResponse.json({ ok: false, error: status === 500 ? 'Unable to save seller video brief.' : error.message }, { status, headers: { 'Cache-Control': 'private, no-store' } });
    }
    const result = Array.isArray(data) ? data[0] : data;
    if (!result?.saved_brief) return NextResponse.json({ ok: false, error: 'Brief storage returned no record.' }, { status: 500, headers: { 'Cache-Control': 'private, no-store' } });
    return NextResponse.json({ ok: true, brief: result.saved_brief, savedAt: result.saved_at, reused: Boolean(result.reused) }, { status: result.reused ? 200 : 201, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return responseError(error);
  }
}
