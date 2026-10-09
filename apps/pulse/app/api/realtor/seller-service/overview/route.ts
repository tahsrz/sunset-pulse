import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { realtorApi } from '@/lib/realtor-workspace/http.server';
import { throwRealtorRpcError } from '@/lib/realtor-workspace/access.server';
import { sellerEmailConfigured } from '@/lib/realtor-workspace/sellerService.server';
export const dynamic = 'force-dynamic';
export function GET(request: NextRequest) {
  return realtorApi(request, async (actor) => {
    const results = await Promise.all([supabaseAdmin.rpc('seller_service_funnel', { p_actor_id: actor }), supabaseAdmin.rpc('seller_service_health', { p_actor_id: actor })]);
    for (const result of results) if (result.error) throwRealtorRpcError(result.error.code);
    return { funnel: results[0].data, health: { ...results[1].data, emailConfigured: sellerEmailConfigured(), webhookConfigured: Boolean(process.env.RESEND_SELLER_WEBHOOK_SECRET), intakeConfigured: Boolean(process.env.KELLER_WESTLAKE_AGENT_SITE) } };
  });
}
