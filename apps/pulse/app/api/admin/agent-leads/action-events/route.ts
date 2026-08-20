import { NextRequest } from 'next/server';
import { z } from 'zod';
import { validationErrorResponse } from '@/lib/core/apiResponse';
import { isAuthResponse, operatorAuditUser, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { resolveOperatorAgentId } from '@/lib/intelligence/agentNotificationStore';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const actionEventSchema = z.object({
  leadId: z.string().uuid(),
  actionType: z.enum(['call', 'email', 'sms']),
  agentId: z.string().trim().min(1).max(160),
  listingId: z.string().trim().min(1).max(160).nullable().optional(),
}).strict();

export async function POST(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;

  const parsed = actionEventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationErrorResponse(parsed.error.flatten());

  const operator = operatorAuditUser(access);
  const agentId = await resolveOperatorAgentId(access, parsed.data.agentId);
  const { error } = await supabaseAdmin.rpc('log_intelligence_event', {
    p_type: 'AGENT_LEAD_ACTION_OPENED',
    p_description: 'Operator opened the recommended lead action.',
    p_actor_id: operator.userId,
    p_actor_name: operator.name,
    p_target_id: parsed.data.leadId,
    p_metadata: {
      actionType: parsed.data.actionType,
      agentId,
      listingId: parsed.data.listingId || null,
    },
    p_severity: 'INFO',
  });

  if (error) console.warn('[AGENT_LEAD_ACTION_EVENT]', error.message);
  return new Response(null, { status: 204 });
}
