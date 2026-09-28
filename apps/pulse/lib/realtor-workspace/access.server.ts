import 'server-only';

import { supabaseAdmin } from '@/lib/supabase';

export class RealtorWorkspaceError extends Error {
  constructor(public readonly code: 'SETUP_REQUIRED' | 'NOT_FOUND' | 'FORBIDDEN' | 'INVALID' | 'CONFLICT' | 'FAILED') {
    super('Unable to access the personal realtor workspace.');
  }
}

export async function requirePersonalRealtorWorkspace(actorId: string) {
  const { data: preferences, error } = await supabaseAdmin.from('realtor_preferences')
    .select('user_id,workspace_id,time_zone,reminders_enabled,gamification_enabled,celebrations_enabled,hide_amounts_on_today,records_start_date,revision')
    .eq('user_id', actorId).maybeSingle();
  if (error) throw new RealtorWorkspaceError('FAILED');
  if (!preferences) throw new RealtorWorkspaceError('SETUP_REQUIRED');

  const { data: allowed, error: accessError } = await supabaseAdmin.rpc('realtor_personal_access', {
    p_actor_id: actorId, p_workspace_id: preferences.workspace_id,
  });
  if (accessError) throw new RealtorWorkspaceError('FAILED');
  if (!allowed) throw new RealtorWorkspaceError('FORBIDDEN');
  return { workspaceId: preferences.workspace_id as string, preferences };
}

export function throwRealtorRpcError(code?: string): never {
  if (code === '42501') throw new RealtorWorkspaceError('FORBIDDEN');
  if (code === 'P0002') throw new RealtorWorkspaceError('NOT_FOUND');
  if (code === '22023' || code === '22P02') throw new RealtorWorkspaceError('INVALID');
  if (code === '23505' || code === '40001' || code === '55P03') throw new RealtorWorkspaceError('CONFLICT');
  throw new RealtorWorkspaceError('FAILED');
}
