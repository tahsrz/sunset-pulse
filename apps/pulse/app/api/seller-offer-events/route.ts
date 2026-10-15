import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { readWorkflowBody } from '@/lib/platform/workflows/http.server';
import { applyPublicApiRateLimit } from '@/lib/core/publicApiRateLimit';
import { getTenantSite } from '@/lib/sites/siteData';
import { normalizeCampaign } from '@/lib/marketing/leadMagnetContract';
import { supabaseAdmin } from '@/lib/supabase';
const schema = z.object({ consent: z.literal(true), visitId: z.string().uuid(), type: z.enum(['visit','offer_click']), campaign: z.string().max(80).nullable() }).strict();
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  const site = process.env.KELLER_WESTLAKE_AGENT_SITE?.trim().toLowerCase();
  if (!site || !/^[a-z0-9-]{1,63}$/.test(site)) return NextResponse.json({ ok: false }, { status: 503 });
  try {
    const input = schema.parse(await readWorkflowBody(request));
    const limited = await applyPublicApiRateLimit(request, 'seller-offer-measurement', 12, 60, { requireDistributed: true });
    if (limited) return limited;
    const tenant = await getTenantSite(site);
    if (!tenant.isPublished || tenant.status !== 'active' || !tenant.agentId) return NextResponse.json({ ok: false }, { status: 503 });
    const campaign = normalizeCampaign({ campaign: input.campaign })?.campaign;
    const key = campaign && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(campaign) ? campaign : 'unattributed/unknown';
    const { error } = await supabaseAdmin.rpc('seller_offer_record', { p_agent_id: tenant.agentId, p_site: site, p_visit_id: input.visitId, p_type: input.type, p_campaign: key });
    return NextResponse.json({ ok: !error }, { status: error ? 503 : 200, headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
}
