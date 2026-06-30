import { supabaseAdmin } from '@/lib/supabase';

const LEASE_NAME = 'canonical-mls-sync';

export async function acquireMlsSyncLease(ownerId: string, ttlSeconds = 1_800) {
  if (process.env.NODE_ENV === 'test') return true;
  const { data, error } = await supabaseAdmin.rpc('acquire_mls_sync_lease', {
    p_lock_name: LEASE_NAME,
    p_owner_id: ownerId,
    p_ttl_seconds: Math.max(60, Math.min(ttlSeconds, 3_600)),
  });
  if (error) throw new Error(`MLS sync lease acquisition failed: ${error.message}`);
  return data === true;
}

export async function releaseMlsSyncLease(ownerId: string) {
  if (process.env.NODE_ENV === 'test') return;
  const { error } = await supabaseAdmin.rpc('release_mls_sync_lease', {
    p_lock_name: LEASE_NAME,
    p_owner_id: ownerId,
  });
  if (error) console.error('[MLS_SYNC_LEASE_RELEASE_ERROR]', error.message);
}
