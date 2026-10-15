import { NextRequest, NextResponse } from 'next/server';
import { isAuthResponse, requireSignedInUser } from '@/lib/core/routeAuth';
import { WorkspaceAccessError, requireWorkspaceAccess } from '@/lib/platform/access/workspaceAccess.server';
import { supabaseAdmin } from '@/lib/supabase';
import { sellerLeadAttributionSchema } from '@/lib/marketing/sellerLeadAttributionSchema';
import { readSellerVideoJson } from '@/lib/marketing/sellerVideoRouteBody.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function failure(error: unknown) {
  if (error instanceof WorkspaceAccessError) {
    const status = error.code === 'INVALID' ? 400 : error.code === 'FORBIDDEN' ? 403 : 404;
    return NextResponse.json({ ok: false, error: error.message }, { status, headers: { 'Cache-Control': 'private, no-store' } });
  }
  return NextResponse.json({ ok: false, error: 'Unable to process seller attribution.' }, { status: 500, headers: { 'Cache-Control': 'private, no-store' } });
}

export async function GET(request: NextRequest) {
  const access = await requireSignedInUser(request);
  if (isAuthResponse(access)) return access;
  const workspaceId = request.nextUrl.searchParams.get('workspaceId') || '';
  try {
    await requireWorkspaceAccess(access.user.id, workspaceId, 'artifact:record_publication');
    const { data: sites, error: siteError } = await supabaseAdmin.from('site_config')
      .select('agent_id').eq('owner_id', access.user.id).eq('status', 'active').limit(20);
    if (siteError) throw siteError;
    const agentIds = [...new Set((sites || []).map((site) => site.agent_id).filter(Boolean))];
    if (!agentIds.length) {
      return NextResponse.json({ ok: true, publications: [], leads: [], attributions: [] }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    const { data: leadRows, error: leadError } = await supabaseAdmin.from('agent_site_leads')
      .select('id,agent_id,name,created_at,status,metadata')
      .eq('source', 'seller_plan').in('agent_id', agentIds).order('created_at', { ascending: false }).limit(100);
    if (leadError) throw leadError;
    const leadIds = (leadRows || []).map((lead) => lead.id);
    const [publicationResult, attributionResult] = await Promise.all([
      supabaseAdmin.from('seller_video_publication_records')
        .select('id,brief_id,brief_revision,platform,public_url,published_at')
        .eq('workspace_id', workspaceId).order('published_at', { ascending: false }).limit(100),
      leadIds.length
        ? supabaseAdmin.from('seller_lead_publication_attributions')
          .select('id,publication_id,lead_id,evidence_note,created_at')
          .eq('workspace_id', workspaceId).in('lead_id', leadIds).order('created_at', { ascending: false }).limit(200)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (publicationResult.error) throw publicationResult.error;
    if (attributionResult.error) throw attributionResult.error;
    const leads = (leadRows || []).map((lead) => {
      const metadata = lead.metadata && typeof lead.metadata === 'object' ? lead.metadata as Record<string, unknown> : {};
      const sellerPlan = metadata.sellerPlan && typeof metadata.sellerPlan === 'object' ? metadata.sellerPlan as Record<string, unknown> : {};
      return { id: lead.id, name: lead.name, created_at: lead.created_at, status: lead.status,
        request_kind: typeof sellerPlan.requestKind === 'string' ? sellerPlan.requestKind : null };
    });
    return NextResponse.json({ ok: true, publications: publicationResult.data || [], leads, attributions: attributionResult.data || [] }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return failure(error); }
}

export async function POST(request: NextRequest) {
  const access = await requireSignedInUser(request);
  if (isAuthResponse(access)) return access;
  const { body, response } = await readSellerVideoJson(request, 'Attribution request rejected');
  if (response) return response;
  const parsed = sellerLeadAttributionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid seller attribution.', details: parsed.error.flatten() }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } });
  try {
    await requireWorkspaceAccess(access.user.id, parsed.data.workspaceId, 'artifact:record_publication');
    const { data, error } = await supabaseAdmin.rpc('platform_record_seller_lead_publication_attribution', {
      p_actor_id: access.user.id,
      p_workspace_id: parsed.data.workspaceId,
      p_publication_id: parsed.data.publicationId,
      p_lead_id: parsed.data.leadId,
      p_evidence_note: parsed.data.evidenceNote,
      p_request_key: parsed.data.requestKey,
    });
    if (error) {
      const status = error.code === '42501' ? 403 : error.code === 'P0002' ? 404
        : error.code === '23505' ? 409 : error.code === '22023' ? 400 : 500;
      return NextResponse.json({ ok: false, error: status === 500 ? 'Unable to record seller attribution.' : error.message }, { status, headers: { 'Cache-Control': 'private, no-store' } });
    }
    const result = Array.isArray(data) ? data[0] : data;
    if (!result?.attribution) return NextResponse.json({ ok: false, error: 'Attribution returned no result.' }, { status: 500, headers: { 'Cache-Control': 'private, no-store' } });
    return NextResponse.json({ ok: true, attribution: result.attribution, reused: Boolean(result.reused) }, { status: result.reused ? 200 : 201, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return failure(error); }
}
