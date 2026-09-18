import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { supabaseAdmin } from '../lib/supabase.js';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDirectory, '../.env.local') });

export type ScopeCandidate = Readonly<{
  ownerId: string | null;
  resourceType: 'profile' | 'site_config' | 'property_shortlist';
  resourceId: string;
  workspaceId: string | null;
  status: 'ready' | 'unmapped' | 'ambiguous';
  reason: string | null;
}>;

export type ScopeTarget = 'local' | 'preview' | 'production';

const WRITE_BATCH_SIZE = 100;

export function summarizeScopeCandidates(candidates: readonly ScopeCandidate[]) {
  return candidates.reduce<Record<string, number>>((counts, candidate) => {
    const key = `${candidate.resourceType}:${candidate.status}`;
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function hasWriteFlag() {
  return process.argv.includes('--write');
}

export function parseScopeTarget(argv: readonly string[] = process.argv): ScopeTarget {
  const targetIndex = argv.indexOf('--target');
  const target = targetIndex >= 0 ? argv[targetIndex + 1] : undefined;
  if (target !== 'local' && target !== 'preview' && target !== 'production') {
    throw new Error('An explicit --target local|preview|production is required.');
  }
  return target;
}

async function loadScopeCandidates(): Promise<ScopeCandidate[]> {
  const [profilesResult, workspacesResult, sitesResult, propertiesResult] = await Promise.all([
    supabaseAdmin.from('profiles').select('id'),
    supabaseAdmin.from('platform_workspaces').select('id,created_by,kind,status').eq('kind', 'personal').eq('status', 'active'),
    supabaseAdmin.from('site_config').select('id,owner_id'),
    supabaseAdmin.from('property_shortlist_entries').select('id,owner_id'),
  ]);
  const firstError = profilesResult.error || workspacesResult.error || sitesResult.error || propertiesResult.error;
  if (firstError) throw new Error(`Unable to inspect scope candidates: ${firstError.message}`);

  const workspacesByOwner = new Map<string, string[]>();
  for (const workspace of workspacesResult.data || []) {
    const ids = workspacesByOwner.get(workspace.created_by) || [];
    ids.push(workspace.id);
    workspacesByOwner.set(workspace.created_by, ids);
  }

  const workspaceForOwner = (ownerId: string | null) => {
    if (!ownerId) return { workspaceId: null, status: 'unmapped' as const, reason: 'Record has no owner ID.' };
    const workspaceIds = workspacesByOwner.get(ownerId) || [];
    if (workspaceIds.length === 1) return { workspaceId: workspaceIds[0], status: 'ready' as const, reason: null };
    if (!workspaceIds.length) return { workspaceId: null, status: 'unmapped' as const, reason: 'Owner has no active personal workspace.' };
    return { workspaceId: null, status: 'ambiguous' as const, reason: 'Owner has multiple active personal workspaces.' };
  };

  const candidates: ScopeCandidate[] = [];
  for (const profile of profilesResult.data || []) {
    const mapping = workspaceForOwner(profile.id);
    candidates.push({ ownerId: profile.id, resourceType: 'profile', resourceId: profile.id, ...mapping });
  }
  for (const site of sitesResult.data || []) {
    const mapping = workspaceForOwner(site.owner_id);
    candidates.push({ ownerId: site.owner_id, resourceType: 'site_config', resourceId: site.id, ...mapping });
  }
  for (const property of propertiesResult.data || []) {
    const mapping = workspaceForOwner(property.owner_id);
    candidates.push({ ownerId: property.owner_id, resourceType: 'property_shortlist', resourceId: property.id, ...mapping });
  }
  return candidates;
}

async function persistScopeCandidates(candidates: readonly ScopeCandidate[], target: ScopeTarget) {
  if (target === 'production' && process.env.PLATFORM_SCOPE_CONFIRM_PRODUCTION !== 'true') {
    throw new Error('Production scope writes require PLATFORM_SCOPE_CONFIRM_PRODUCTION=true.');
  }
  for (let offset = 0; offset < candidates.length; offset += WRITE_BATCH_SIZE) {
    const batch = candidates.slice(offset, offset + WRITE_BATCH_SIZE).map((candidate) => ({
      resource_type: candidate.resourceType,
      resource_id: candidate.resourceId,
      owner_id: candidate.ownerId,
      workspace_id: candidate.workspaceId,
      status: candidate.status === 'ready' ? 'mapped' : candidate.status,
      reason: candidate.reason,
      revision: 1,
    }));
    const { error } = await supabaseAdmin
      .from('platform_scope_links')
      .upsert(batch, { onConflict: 'resource_type,resource_id' });
    if (error) throw new Error(`Unable to persist scope batch ${offset / WRITE_BATCH_SIZE + 1}: ${error.message}`);
  }
}

async function main() {
  const target = parseScopeTarget();
  const candidates = await loadScopeCandidates();
  if (hasWriteFlag()) await persistScopeCandidates(candidates, target);
  console.log(JSON.stringify({
    mode: hasWriteFlag() ? 'backfill' : 'dry-run',
    target,
    writeEnabled: hasWriteFlag(),
    batchSize: WRITE_BATCH_SIZE,
    candidateCount: candidates.length,
    summary: summarizeScopeCandidates(candidates),
    candidates,
  }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error('[PLATFORM_SCOPE_DRY_RUN_FAILED]', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
