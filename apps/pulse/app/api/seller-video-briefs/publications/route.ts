import { NextRequest, NextResponse } from 'next/server';
import { isAuthResponse, requireSignedInUser } from '@/lib/core/routeAuth';
import { WorkspaceAccessError, requireWorkspaceAccess } from '@/lib/platform/access/workspaceAccess.server';
import { supabaseAdmin } from '@/lib/supabase';
import { videoPublicationRecordSchema } from '@/lib/marketing/videoPublicationRecordSchema';
import { readSellerVideoJson } from '@/lib/marketing/sellerVideoRouteBody.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function accessError(error: unknown) {
  if (error instanceof WorkspaceAccessError) {
    const status = error.code === 'INVALID' ? 400 : error.code === 'FORBIDDEN' ? 403 : 404;
    return NextResponse.json({ ok: false, error: error.message }, { status, headers: { 'Cache-Control': 'private, no-store' } });
  }
  return NextResponse.json({ ok: false, error: 'Unable to process publication record.' }, { status: 500, headers: { 'Cache-Control': 'private, no-store' } });
}

export async function GET(request: NextRequest) {
  const access = await requireSignedInUser(request);
  if (isAuthResponse(access)) return access;
  const workspaceId = request.nextUrl.searchParams.get('workspaceId');
  try {
    await requireWorkspaceAccess(access.user.id, workspaceId || '', 'artifact:record_publication');
    const { data, error } = await supabaseAdmin.from('seller_video_publication_records')
      .select('id,brief_id,brief_revision,review_checkpoint_id,platform,public_url,published_at,entered_by,created_at')
      .eq('workspace_id', workspaceId!)
      .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(100);
    if (error) throw error;
    return NextResponse.json({ ok: true, records: data || [] }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return accessError(error); }
}

export async function POST(request: NextRequest) {
  const access = await requireSignedInUser(request);
  if (isAuthResponse(access)) return access;
  const { body, response } = await readSellerVideoJson(request, 'Publication request rejected');
  if (response) return response;
  const parsed = videoPublicationRecordSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid manual publication record.', details: parsed.error.flatten() }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } });
  try {
    await requireWorkspaceAccess(access.user.id, parsed.data.workspaceId, 'artifact:record_publication');
    const { data, error } = await supabaseAdmin.rpc('platform_record_seller_video_publication', {
      p_actor_id: access.user.id,
      p_workspace_id: parsed.data.workspaceId,
      p_brief_id: parsed.data.briefId,
      p_revision: parsed.data.revision,
      p_platform: parsed.data.platform,
      p_public_url: new URL(parsed.data.publicUrl).toString(),
      p_published_at: parsed.data.publishedAt,
      p_request_key: parsed.data.requestKey,
    });
    if (error) {
      const status = error.code === '42501' ? 403 : error.code === 'P0002' ? 404
        : error.code === '40001' || error.code === '23505' ? 409
          : error.code === '22023' ? 400 : 500;
      return NextResponse.json({ ok: false, error: status === 500 ? 'Unable to record publication.' : error.message }, { status, headers: { 'Cache-Control': 'private, no-store' } });
    }
    const result = Array.isArray(data) ? data[0] : data;
    if (!result?.publication) return NextResponse.json({ ok: false, error: 'Publication record returned no result.' }, { status: 500, headers: { 'Cache-Control': 'private, no-store' } });
    return NextResponse.json({ ok: true, record: result.publication, reused: Boolean(result.reused) }, { status: result.reused ? 200 : 201, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return accessError(error); }
}
