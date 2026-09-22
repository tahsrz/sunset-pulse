import 'server-only';
import { supabaseAdmin } from '@/lib/supabase';
import { requireWorkspaceAccess } from '@/lib/platform/access/workspaceAccess.server';
import { appInstallInputSchema, appManifestSchema } from '@/lib/platform/contracts/appManifest';
import { PlatformRunError } from '@/lib/platform/workflows/runStore.server';

export async function saveAppInstall(actorId: string, workspaceId: string, input: unknown) {
  const value = appInstallInputSchema.parse(input);
  await requireWorkspaceAccess(actorId, workspaceId, 'workspace:manage_apps');
  const { data, error } = await supabaseAdmin.rpc('platform_save_app_install', {
    p_actor_id: actorId, p_workspace_id: workspaceId, p_manifest: value.manifest,
    p_settings: value.settings, p_status: value.status, p_expected_revision: value.expectedRevision,
  });
  if (error) throw new PlatformRunError(error.code);
  const result = Array.isArray(data) ? data[0] : data;
  if (!result) throw new PlatformRunError('P0002');
  return result;
}

export async function listAppInstalls(actorId: string, workspaceId: string) {
  await requireWorkspaceAccess(actorId, workspaceId, 'workspace:read');
  const { data, error } = await supabaseAdmin.from('platform_app_installs')
    .select('id,workspace_id,app_key,manifest,manifest_hash,settings,status,revision,updated_at')
    .eq('workspace_id', workspaceId).order('app_key', { ascending: true }).limit(32);
  if (error) throw new PlatformRunError(error.code);
  return (data || []).map((row) => ({
    id: row.id, workspaceId: row.workspace_id, appKey: row.app_key, manifest: appManifestSchema.parse(row.manifest),
    manifestHash: row.manifest_hash, settings: row.settings, status: row.status, revision: row.revision, updatedAt: row.updated_at,
  }));
}
