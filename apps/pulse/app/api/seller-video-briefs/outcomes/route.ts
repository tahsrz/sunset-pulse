import { NextRequest, NextResponse } from 'next/server';
import { isAuthResponse, requireSignedInUser } from '@/lib/core/routeAuth';
import { WorkspaceAccessError, requireWorkspaceAccess } from '@/lib/platform/access/workspaceAccess.server';
import { supabaseAdmin } from '@/lib/supabase';
import { videoPublicationOutcomeSchema } from '@/lib/marketing/videoPublicationOutcomeSchema';
import { readSellerVideoJson } from '@/lib/marketing/sellerVideoRouteBody.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function accessError(error: unknown) {
  if (error instanceof WorkspaceAccessError) {
    const status = error.code === 'INVALID' ? 400 : error.code === 'FORBIDDEN' ? 403 : 404;
    return NextResponse.json({ ok: false, error: error.message }, { status, headers: { 'Cache-Control': 'private, no-store' } });
  }
  return NextResponse.json({ ok: false, error: 'Unable to process publication outcome.' }, { status: 500, headers: { 'Cache-Control': 'private, no-store' } });
}

export async function GET(request: NextRequest) {
  const access = await requireSignedInUser(request);
  if (isAuthResponse(access)) return access;
  const workspaceId = request.nextUrl.searchParams.get('workspaceId');
  try {
    await requireWorkspaceAccess(access.user.id, workspaceId || '', 'artifact:record_publication');
    const { data, error } = await supabaseAdmin.from('seller_video_publication_outcomes')
      .select('id,publication_id,captured_at,views,engagements,link_clicks,seller_plan_requests,source_note,entered_by,created_at')
      .eq('workspace_id', workspaceId!)
      .order('captured_at', { ascending: false }).order('id', { ascending: false }).limit(200);
    if (error) throw error;
    return NextResponse.json({ ok: true, outcomes: data || [] }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return accessError(error); }
}

export async function POST(request: NextRequest) {
  const access = await requireSignedInUser(request);
  if (isAuthResponse(access)) return access;
  const { body, response } = await readSellerVideoJson(request, 'Outcome request rejected');
  if (response) return response;
  const parsed = videoPublicationOutcomeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid publication outcome snapshot.', details: parsed.error.flatten() }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } });
  try {
    await requireWorkspaceAccess(access.user.id, parsed.data.workspaceId, 'artifact:record_publication');
    const { data, error } = await supabaseAdmin.rpc('platform_record_seller_video_publication_outcome', {
      p_actor_id: access.user.id,
      p_workspace_id: parsed.data.workspaceId,
      p_publication_id: parsed.data.publicationId,
      p_captured_at: parsed.data.capturedAt,
      p_views: parsed.data.views,
      p_engagements: parsed.data.engagements,
      p_link_clicks: parsed.data.linkClicks,
      p_seller_plan_requests: parsed.data.sellerPlanRequests,
      p_source_note: parsed.data.sourceNote,
      p_request_key: parsed.data.requestKey,
    });
    if (error) {
      const status = error.code === '42501' ? 403 : error.code === 'P0002' ? 404
        : error.code === '23505' ? 409 : error.code === '22023' ? 400 : 500;
      return NextResponse.json({ ok: false, error: status === 500 ? 'Unable to record publication outcome.' : error.message }, { status, headers: { 'Cache-Control': 'private, no-store' } });
    }
    const result = Array.isArray(data) ? data[0] : data;
    if (!result?.outcome) return NextResponse.json({ ok: false, error: 'Publication outcome returned no result.' }, { status: 500, headers: { 'Cache-Control': 'private, no-store' } });
    return NextResponse.json({ ok: true, outcome: result.outcome, reused: Boolean(result.reused) }, { status: result.reused ? 200 : 201, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return accessError(error); }
}
