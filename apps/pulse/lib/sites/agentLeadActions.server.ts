import 'server-only';

import { supabaseAdmin } from '@/lib/supabase';

export class AgentLeadActionError extends Error {
  constructor(public readonly code?: string) {
    super('Unable to apply the lead action.');
  }
}

export async function applyAgentLeadAction(actorKey: string, action: unknown, auditUser: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin.rpc('agent_apply_lead_action', {
    p_actor_key: actorKey,
    p_action: action,
    p_audit_user: auditUser,
  });
  if (error) throw new AgentLeadActionError(error.code);
  return data as { ok: true; replayed: boolean; lead: Record<string, unknown> };
}
