import 'server-only';

import { supabaseAdmin } from '@/lib/supabase';
import { requireWorkspaceAccess } from '@/lib/platform/access/workspaceAccess.server';
import { saveCanvasLayoutInputSchema } from '@/lib/platform/contracts/canvasLayout';
import { PlatformRunError } from '@/lib/platform/workflows/runStore.server';

export async function getUserCanvasLayout(actorId: string, workspaceId: string) {
  await requireWorkspaceAccess(actorId, workspaceId, 'workspace:read');
  const { data, error } = await supabaseAdmin.from('platform_user_layouts')
    .select('workspace_id,user_id,schema_version,layout,revision,updated_at')
    .eq('workspace_id', workspaceId).eq('user_id', actorId).maybeSingle();
  if (error) throw new PlatformRunError(error.code);
  return data ? {
    workspaceId: data.workspace_id,
    userId: data.user_id,
    schemaVersion: data.schema_version,
    layout: data.layout,
    revision: data.revision,
    updatedAt: data.updated_at,
  } : null;
}

export async function saveUserCanvasLayout(actorId: string, workspaceId: string, input: unknown) {
  const value = saveCanvasLayoutInputSchema.parse(input);
  if (value.layout.workspaceId !== workspaceId) throw new PlatformRunError('22023');
  await requireWorkspaceAccess(actorId, workspaceId, 'workspace:read');
  if (value.expectedRevision !== null) {
    const { data: current, error: readError } = await supabaseAdmin.from('platform_user_layouts')
      .select('revision').eq('workspace_id', workspaceId).eq('user_id', actorId).maybeSingle();
    if (readError) throw new PlatformRunError(readError.code);
    if (current && current.revision !== value.expectedRevision) throw new PlatformRunError('40001');
  }
  const { data, error } = await supabaseAdmin.rpc('platform_save_user_layout', {
    p_actor_id: actorId,
    p_workspace_id: workspaceId,
    p_layout: value.layout,
    p_expected_revision: value.expectedRevision,
  });
  // Some PostgREST/PostgreSQL combinations normalize raised serialization
  // conflicts to P0001. Normalize this exact, non-sensitive domain message so
  // the workspace route still returns its documented 409 response.
  if (error) throw new PlatformRunError(error.message === 'Canvas layout revision conflict' ? '40001' : error.code);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new PlatformRunError('P0002');
  return {
    workspaceId: row.workspace_id,
    userId: row.user_id,
    schemaVersion: row.schema_version,
    layout: row.layout,
    revision: row.revision,
    updatedAt: row.updated_at,
  };
}
