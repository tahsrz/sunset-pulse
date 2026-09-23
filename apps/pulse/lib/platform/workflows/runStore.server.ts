import 'server-only';

import { supabaseAdmin } from '@/lib/supabase';
import { requireWorkspaceAccess } from '@/lib/platform/access/workspaceAccess.server';
import { cancelRunSchema, checkpointResponseSchema, startRunSchema, supersedeRunSchema } from '@/lib/platform/contracts/run';
import { encodeCursor, parsePage, parseScopedPage } from '@/lib/platform/contracts/pagination';
import { z } from 'zod';

export class PlatformRunError extends Error {
  constructor(public readonly code: string) { super('Unable to process workflow request.'); }
}
async function rpc(name: string, args: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin.rpc(name, args);
  if (error) throw new PlatformRunError(error.code);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new PlatformRunError('P0002');
  return row;
}
export async function startRun(actorId: string, workspaceId: string, input: unknown) {
  const value = startRunSchema.parse(input);
  await requireWorkspaceAccess(actorId, workspaceId, 'workflow:run');
  return rpc('platform_start_run', {
    p_actor_id: actorId, p_workspace_id: workspaceId, p_request_key: value.requestKey, p_definition: value.definition,
  });
}
export async function listRuns(actorId: string, workspaceId: string, search = new URLSearchParams()) {
  const { limit, cursor } = parsePage(search, workspaceId, 'runs');
  await requireWorkspaceAccess(actorId, workspaceId, 'workspace:read');
  let query = supabaseAdmin.from('platform_runs')
    .select('id,workspace_id,definition,definition_hash,state,status,revision,created_at,updated_at,supersedes,superseded_by,supersession_reason')
    .eq('workspace_id', workspaceId).order('created_at', { ascending: false }).order('id', { ascending: false });
  if (cursor) query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
  const { data, error } = await query.limit(limit + 1);
  if (error) throw new PlatformRunError(error.code);
  return pageResult(data || [], limit, workspaceId, 'runs');
}
export async function getRun(actorId: string, workspaceId: string, runId: string) {
  z.string().uuid().parse(runId);
  await requireWorkspaceAccess(actorId, workspaceId, 'workspace:read');
  const { data: run, error: runError } = await supabaseAdmin.from('platform_runs')
    .select('id,workspace_id,definition,definition_hash,state,status,revision,created_at,updated_at,supersedes,superseded_by,supersession_reason,app_install_id,app_manifest_hash,app_workflow_key,app_install_revision,app_inputs,app_resource_refs')
    .eq('workspace_id', workspaceId).eq('id', runId).maybeSingle();
  if (runError) throw new PlatformRunError(runError.code);
  if (!run) throw new PlatformRunError('P0002');
  const { data: checkpoints, error: checkpointError } = await supabaseAdmin.from('platform_checkpoints')
    .select('id,run_id,node_id,type,prompt,response_schema,target,status,revision,response,submission_key,resolved_by,resolved_at,created_at')
    .eq('workspace_id', workspaceId).eq('run_id', runId).order('created_at', { ascending: true });
  if (checkpointError) throw new PlatformRunError(checkpointError.code);
  return { run, checkpoints: checkpoints || [] };
}
export async function listCheckpoints(actorId: string, workspaceId: string, search = new URLSearchParams()) {
  const { limit, cursor } = parsePage(search, workspaceId, 'checkpoints');
  await requireWorkspaceAccess(actorId, workspaceId, 'workspace:read');
  let query = supabaseAdmin.from('platform_checkpoints')
    .select('id,run_id,node_id,type,prompt,response_schema,target,status,revision,created_at')
    .eq('workspace_id', workspaceId).eq('status', 'pending').order('created_at', { ascending: true }).order('id', { ascending: true });
  if (cursor) query = query.or(`created_at.gt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.gt.${cursor.id})`);
  const { data, error } = await query.limit(limit + 1);
  if (error) throw new PlatformRunError(error.code);
  const page = pageResult(data || [], limit, workspaceId, 'checkpoints');
  const healthPage = parseScopedPage(search, workspaceId, 'connector_health', 'healthLimit', 'healthCursor');
  const healthHistoryPage = parseScopedPage(search, workspaceId, 'connector_health_history', 'healthHistoryLimit', 'healthHistoryCursor');
  let healthQuery = supabaseAdmin.from('platform_connector_health')
    .select('id,connector_id,connection_id,title,status,checked_at,snapshot_hash,detail,updated_at')
    .eq('workspace_id', workspaceId).order('checked_at', { ascending: false }).order('id', { ascending: false });
  if (healthPage.cursor) healthQuery = healthQuery.or(`checked_at.lt.${healthPage.cursor.createdAt},and(checked_at.eq.${healthPage.cursor.createdAt},id.lt.${healthPage.cursor.id})`);
  const { data: healthRows, error: healthError } = await healthQuery.limit(healthPage.limit + 1);
  if (healthError) throw new PlatformRunError(healthError.code);
  const { data: healthJobs, error: healthJobError } = await supabaseAdmin.from('workflow_jobs')
    .select('id,status,scheduled_for,updated_at,payload')
    .eq('workflow_key', 'connector_health_check').eq('payload->>workspaceId', workspaceId)
    .in('status', ['queued', 'deferred', 'running']).order('scheduled_for', { ascending: false }).limit(100);
  if (healthJobError) throw new PlatformRunError(healthJobError.code);
  const now = Date.now();
  const freshnessWindowMs = 24 * 60 * 60 * 1000;
  const jobsByConnector = new Map<string, { id: string; status: string; scheduled_for: string; updated_at: string }>();
  for (const job of healthJobs || []) {
    const connectorId = typeof job.payload?.connectorId === 'string' ? job.payload.connectorId : null;
    if (connectorId && !jobsByConnector.has(connectorId)) jobsByConnector.set(connectorId, job);
  }
  const healthItems = (healthRows || []).slice(0, healthPage.limit);
  const healthLast = healthItems.at(-1);
  const healthWithFreshness = healthItems.map((entry) => {
    const job = jobsByConnector.get(entry.connector_id);
    const checkedAt = Date.parse(entry.checked_at);
    const isStale = !Number.isFinite(checkedAt) || checkedAt <= now - freshnessWindowMs;
    const schedulerStatus = job
      ? (job.status === 'running' ? 'running' : Date.parse(job.scheduled_for) <= now ? 'overdue' : 'queued')
      : isStale ? 'due' : 'fresh';
    return { ...entry, scheduler_status: schedulerStatus, next_check_at: job?.scheduled_for || null };
  });
  const { data: summaryRows, error: summaryError } = await supabaseAdmin.rpc('platform_connector_health_summary', { p_workspace_id: workspaceId });
  if (summaryError) throw new PlatformRunError(summaryError.code);
  const healthSummary = { healthy: 0, unavailable: 0, schema_drift: 0, stale: 0 };
  for (const row of summaryRows || []) if (row.status in healthSummary) healthSummary[row.status as keyof typeof healthSummary] = Number(row.count || 0);
  let healthHistoryQuery = supabaseAdmin.from('platform_connector_health_history')
    .select('id,connector_id,health_id,status,checked_at,snapshot_hash,detail,recorded_at')
    .eq('workspace_id', workspaceId).order('recorded_at', { ascending: false }).order('id', { ascending: false });
  if (healthHistoryPage.cursor) healthHistoryQuery = healthHistoryQuery.or(`recorded_at.lt.${healthHistoryPage.cursor.createdAt},and(recorded_at.eq.${healthHistoryPage.cursor.createdAt},id.lt.${healthHistoryPage.cursor.id})`);
  const { data: healthHistoryRows, error: healthHistoryError } = await healthHistoryQuery.limit(healthHistoryPage.limit + 1);
  if (healthHistoryError) throw new PlatformRunError(healthHistoryError.code);
  const healthHistory = (healthHistoryRows || []).slice(0, healthHistoryPage.limit);
  const healthHistoryLast = healthHistory.at(-1);
  return {
    ...page,
    health: healthWithFreshness,
    healthNextCursor: healthRows && healthRows.length > healthPage.limit && healthLast
      ? encodeCursor({ workspaceId, collection: 'connector_health', createdAt: healthLast.checked_at, id: healthLast.id }) : null,
    healthSummary,
    healthHistory,
    healthHistoryNextCursor: healthHistoryRows && healthHistoryRows.length > healthHistoryPage.limit && healthHistoryLast
      ? encodeCursor({ workspaceId, collection: 'connector_health_history', createdAt: healthHistoryLast.recorded_at, id: healthHistoryLast.id }) : null,
  };
}
function pageResult<T extends { id: string; created_at: string }>(rows: T[], limit: number, workspaceId: string, collection: 'runs' | 'checkpoints') {
  const items = rows.slice(0, limit), last = items.at(-1);
  return { items, nextCursor: rows.length > limit && last ? encodeCursor({ workspaceId, collection, createdAt: last.created_at, id: last.id }) : null };
}
export async function respondToCheckpoint(actorId: string, workspaceId: string, input: unknown) {
  const value = checkpointResponseSchema.parse(input);
  // RPC rechecks the type-specific role and current run under locks.
  await requireWorkspaceAccess(actorId, workspaceId, 'workspace:read');
  return rpc('platform_respond_checkpoint', {
    p_actor_id: actorId, p_workspace_id: workspaceId, p_checkpoint_id: value.checkpointId,
    p_expected_revision: value.expectedRevision, p_submission_key: value.submissionKey, p_value: value.value,
  });
}
export async function cancelRun(actorId: string, workspaceId: string, input: unknown) {
  const value = cancelRunSchema.parse(input);
  await requireWorkspaceAccess(actorId, workspaceId, 'workflow:cancel');
  return rpc('platform_cancel_run', {
    p_actor_id: actorId, p_workspace_id: workspaceId, p_run_id: value.runId, p_expected_revision: value.expectedRevision,
  });
}
export async function recoverRun(actorId: string, workspaceId: string, input: unknown) {
  const value = cancelRunSchema.parse(input);
  await requireWorkspaceAccess(actorId, workspaceId, 'workspace:manage_apps');
  return rpc('platform_recover_run', {
    p_actor_id: actorId, p_workspace_id: workspaceId, p_run_id: value.runId, p_expected_revision: value.expectedRevision,
  });
}
export async function supersedeRun(actorId: string, workspaceId: string, input: unknown) {
  const value = supersedeRunSchema.parse(input);
  await requireWorkspaceAccess(actorId, workspaceId, 'workflow:run');
  return rpc('platform_supersede_run', {
    p_actor_id: actorId, p_workspace_id: workspaceId, p_run_id: value.runId, p_expected_revision: value.expectedRevision,
    p_request_key: value.requestKey, p_definition: value.definition, p_reason: value.reason,
  });
}
