import 'server-only';

import { appLaunchInputSchema, appManifestSchema, parseManifestValues, type AppLaunchInput, type AppManifest } from '@/lib/platform/contracts/appManifest';
import { resolveWorkspaceMappedResourceScope, type DomainScopeReference, type DomainResourceType } from '@/lib/platform/access/domainScope.server';
import { requireWorkspaceAccess } from '@/lib/platform/access/workspaceAccess.server';
import { supabaseAdmin } from '@/lib/supabase';
import { PlatformRunError } from '@/lib/platform/workflows/runStore.server';

type InstallRow = Readonly<{
  id: string;
  workspace_id: string;
  manifest: unknown;
  manifest_hash: string;
  settings: unknown;
  status: 'installed' | 'disabled';
  revision: number;
}>;

export type AppLaunchSnapshot = Readonly<{
  installId: string;
  installRevision: number;
  manifestHash: string;
  workspaceId: string;
  actorId: string;
  workflow: AppManifest['workflows'][number];
  inputs: Readonly<Record<string, unknown>>;
  resourceRefs: ReadonlyArray<DomainScopeReference & { expectedRevision: number }>;
}>;

export class AppLaunchError extends Error {
  constructor(public readonly code: 'NOT_FOUND' | 'DISABLED' | 'CONFLICT' | 'INVALID', message: string) {
    super(message);
    this.name = 'AppLaunchError';
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function loadInstall(actorId: string, workspaceId: string, installId: string, expectedRevision: number) {
  await requireWorkspaceAccess(actorId, workspaceId, 'workspace:read');
  const { data, error } = await supabaseAdmin.from('platform_app_installs')
    .select('id,workspace_id,manifest,manifest_hash,settings,status,revision')
    .eq('id', installId).eq('workspace_id', workspaceId).maybeSingle();
  if (error) throw new Error(`Unable to load app install: ${error.message}`);
  if (!data) throw new AppLaunchError('NOT_FOUND', 'App install was not found in this workspace.');
  const install = data as InstallRow;
  if (install.status !== 'installed') throw new AppLaunchError('DISABLED', 'This app install is disabled.');
  if (install.revision !== expectedRevision) throw new AppLaunchError('CONFLICT', 'App install changed. Reload before launching.');
  return install;
}

async function resolveResources(actorId: string, workspaceId: string, input: AppLaunchInput) {
  const resolved: Array<DomainScopeReference & { expectedRevision: number }> = [];
  for (const ref of input.resourceRefs) {
    const scope = await resolveWorkspaceMappedResourceScope(
      actorId, workspaceId, ref.resourceType as DomainResourceType, ref.resourceId,
    );
    if (scope.resourceRevision !== ref.expectedRevision) {
      throw new AppLaunchError('CONFLICT', 'A referenced resource changed. Reload before launching.');
    }
    resolved.push({ ...scope, expectedRevision: ref.expectedRevision });
  }
  return resolved;
}

/**
 * Prepare an immutable, authorized launch snapshot. This function does not
 * insert a run, enqueue work, or execute a capability; admission is a later
 * transaction after the database gate and domain adapters are proven.
 */
export async function prepareAppLaunch(actorId: string, workspaceId: string, rawInput: unknown): Promise<AppLaunchSnapshot> {
  const input = appLaunchInputSchema.parse(rawInput);
  const install = await loadInstall(actorId, workspaceId, input.installId, input.expectedInstallRevision);
  const manifest = appManifestSchema.parse(install.manifest);
  const workflow = manifest.workflows.find((candidate) => candidate.key === input.workflowKey);
  if (!workflow) throw new AppLaunchError('INVALID', 'The requested workflow is not installed.');

  let validatedInputs: Record<string, unknown>;
  try { validatedInputs = parseManifestValues(manifest.inputSchema, input.inputs) as Record<string, unknown>; }
  catch { throw new AppLaunchError('INVALID', 'Launch inputs do not match the installed app schema.'); }

  const resourceRefs = await resolveResources(actorId, workspaceId, input);
  return Object.freeze({
    installId: install.id,
    installRevision: install.revision,
    manifestHash: install.manifest_hash,
    workspaceId,
    actorId,
    workflow: clone(workflow),
    inputs: clone(validatedInputs),
    resourceRefs: clone(resourceRefs),
  });
}

export async function startAppLaunch(actorId: string, workspaceId: string, rawInput: unknown) {
  const input = appLaunchInputSchema.parse(rawInput);
  const snapshot = await prepareAppLaunch(actorId, workspaceId, rawInput);
  const { data, error } = await supabaseAdmin.rpc('platform_start_app_run', {
    p_actor_id: actorId,
    p_workspace_id: workspaceId,
    p_install_id: snapshot.installId,
    p_install_revision: snapshot.installRevision,
    p_workflow_key: snapshot.workflow.key,
    p_request_key: input.requestKey,
    p_inputs: snapshot.inputs,
    p_resource_refs: snapshot.resourceRefs.map((ref) => ({
      resourceType: ref.resourceType, resourceId: ref.resourceId, expectedRevision: ref.expectedRevision,
    })),
  });
  if (error) throw new PlatformRunError(error.code);
  const result = Array.isArray(data) ? data[0] : data;
  if (!result) throw new PlatformRunError('P0002');
  return result;
}
