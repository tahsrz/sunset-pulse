import 'server-only';
import { supabaseAdmin } from '@/lib/supabase';

// Legacy planners accept owner-only inputs. Do not let a team-mapped schedule
// or mixed personal/team data reach those planners until scoped adapters exist.
export async function requireOwnerCompatiblePlanning(jobId: string, leaseToken: string) {
  const { error } = await supabaseAdmin.rpc('platform_require_owner_planning', { p_job_id: jobId, p_lease_token: leaseToken });
  if (error) throw new Error('Sprint planning requires an active, owner-compatible workspace scope.');
}
