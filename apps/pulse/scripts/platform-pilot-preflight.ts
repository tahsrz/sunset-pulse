import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { command } from './docker-acceptance.mjs';
import { evaluatePilotPreflight } from '../lib/platform/pilot/preflight';

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

async function main() {
  const stack = argument('--stack');
  const workspaceId = argument('--workspace');
  if (!stack || !/^[a-z0-9_-]+$/.test(stack) || !workspaceId ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(workspaceId)) {
    throw new Error('Usage: npm run platform:pilot:preflight -- --stack <local-stack-id> --workspace <workspace-uuid>');
  }

  const database = `supabase_db_${stack}`;
  const sql = `SELECT jsonb_build_object(
  'latestMigration',(SELECT max(version)::TEXT FROM supabase_migrations.schema_migrations),
  'admissionEnabled',(SELECT enabled FROM workflow_event_contracts WHERE workflow_key='platform_run'),
  'workspace',(SELECT jsonb_build_object('kind',kind,'status',status) FROM platform_workspaces WHERE id='${workspaceId}'),
  'activeRoleCounts',COALESCE((SELECT jsonb_object_agg(role,role_count) FROM (
    SELECT role,count(*)::INTEGER AS role_count FROM platform_memberships
    WHERE workspace_id='${workspaceId}' AND status='active' GROUP BY role
  ) roles),'{}'::JSONB),
  'installs',COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'appKey',app_key,'status',status,'revision',revision,
    'manifestHashValid',manifest_hash=encode(sha256(convert_to(manifest::TEXT,'UTF8')),'hex'),
    'manifest',manifest
  )) FROM platform_app_installs WHERE workspace_id='${workspaceId}'
    AND app_key IN ('real-estate-readiness','client-content-review')),'[]'::JSONB),
  'budgetConfigured',EXISTS(SELECT 1 FROM platform_quota_limits WHERE workspace_id='${workspaceId}'),
  'connectorDefinitionCount',(SELECT count(*)::INTEGER FROM platform_connector_definitions WHERE workspace_id='${workspaceId}'),
  'activeProviderReviewCount',(SELECT count(*)::INTEGER FROM platform_provider_adapter_reviews
    WHERE workspace_id='${workspaceId}' AND status='reviewed'),
  'providerQuotaCount',(SELECT count(*)::INTEGER FROM platform_provider_quota_limits WHERE workspace_id='${workspaceId}')
)::TEXT;`;

  const raw = await command('docker', [
  'exec', '-i', database, 'psql', '-X', '-qAt', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1',
], { input: sql });
  const snapshot = JSON.parse(raw);
  const reviewedManifests = Object.fromEntries(await Promise.all([
  'real-estate-readiness', 'client-content-review',
  ].map(async (appKey) => [appKey, JSON.parse(await readFile(resolve('lib/platform/apps/manifests', `${appKey}.v1.json`), 'utf8'))])));
  const result = evaluatePilotPreflight(snapshot, reviewedManifests);

  console.log(`Local pilot preflight: ${result.status}`);
  for (const check of result.checks) console.log(`${check.status.toUpperCase()} ${check.id}: ${check.detail}`);
  console.log(result.reminder);
  if (result.status === 'BLOCKED') process.exitCode = 2;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Pilot preflight failed.');
  process.exitCode = 1;
});
