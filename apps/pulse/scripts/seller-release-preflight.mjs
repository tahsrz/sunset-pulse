import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const migrationDirectory = 'apps/pulse/supabase/migrations/';
const requiredMigrations = [
  '20261006130000_platform_connector_health_job_read_model.sql',
  '20261006140000_platform_connector_health_audit_read_model.sql',
  '20261006150000_seller_video_publication_records.sql',
  '20261007100000_seller_lead_actions.sql',
  '20261007103000_agent_lead_action_receipts.sql',
  '20261007110000_realtor_seller_lead_tasks.sql',
  '20261007120000_seller_video_publication_outcomes.sql',
  '20261007130000_seller_daily_read_models.sql',
  '20261007140000_seller_lead_publication_attributions.sql',
  '20261007150000_realtor_seller_campaign_tasks.sql',
  '20261007160000_seller_outcome_scoreboard.sql',
  '20261007170000_realtor_weekly_business_review_v2.sql',
  '20261007180000_seller_outcome_read_models.sql',
  '20261008100000_seller_nonretryable_conflicts.sql',
  '20261008110000_seller_planner_link_read.sql',
  '20261008120000_realtor_reminder_nonretryable_conflicts.sql',
];
export const requiredSellerReleasePaths = [
  ...requiredMigrations.map((name) => migrationDirectory + name),
  'apps/pulse/lib/autonomous-workflows/workflowRegistry.server.ts',
  'apps/pulse/lib/autonomous-workflows/durableScheduler.server.ts',
  'apps/pulse/lib/autonomous-workflows/realtorReminderWorkflow.server.ts',
  'apps/pulse/lib/autonomous-workflows/realtorPlannerRefillWorkflow.server.ts',
  'apps/pulse/app/api/admin/automations/hotlist-email/cron/route.ts',
  'apps/pulse/app/api/admin/automations/hotlist-email/worker/route.ts',
  'apps/pulse/vercel.json',
];

function migrationInventory(names) {
  if (!Array.isArray(names) || !names.length) throw new Error('Migration inventory is empty.');
  const sorted = names.map((name) => {
    const match = typeof name === 'string' ? /^(\d{8}|\d{14})_[a-z0-9_]+\.sql$/.exec(name) : null;
    if (!match) {
      throw new Error('Migration inventory contains an invalid filename.');
    }
    return { version: match[1], file: name };
  }).sort((a, b) => a.version.localeCompare(b.version));
  if (new Set(sorted.map((item) => item.version)).size !== sorted.length) {
    throw new Error('Migration inventory contains duplicate versions.');
  }
  return sorted;
}

// Exported for deterministic offline tests. The reader receives only allowlisted paths.
export async function inspectSellerReleaseSources(manifest, migrationNames, readSource) {
  const inventory = migrationInventory(migrationNames);
  if (!manifest || !Array.isArray(manifest.files)
    || manifest.files.length !== requiredSellerReleasePaths.length) {
    throw new Error(`Compatibility manifest must contain the complete ${requiredSellerReleasePaths.length}-file source packet.`);
  }
  const seen = new Set();
  for (const entry of manifest.files) {
    if (!entry || !requiredSellerReleasePaths.includes(entry.path) || seen.has(entry.path)
      || typeof entry.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(entry.sha256)) {
      throw new Error('Compatibility manifest contains an invalid, duplicate, or unreviewed source entry.');
    }
    seen.add(entry.path);
  }
  for (const file of requiredMigrations) {
    if (!inventory.some((item) => item.file === file)) throw new Error(`Required migration is missing: ${file}`);
  }
  const mismatches = [];
  for (const entry of manifest.files) {
    let bytes;
    try { bytes = await readSource(entry.path); }
    catch { throw new Error(`Required source cannot be read: ${entry.path}`); }
    if (createHash('sha256').update(bytes).digest('hex') !== entry.sha256) mismatches.push(entry.path);
  }
  if (mismatches.length) throw new Error(`Source fingerprints differ from the reviewed packet: ${mismatches.join(', ')}`);
  return { verifiedSourceCount: seen.size, inventory, compatibilityMigrations: requiredMigrations };
}

export function planPendingSellerMigrations(migrationNames, appliedVersions) {
  const inventory = migrationInventory(migrationNames);
  if (!Array.isArray(appliedVersions)
    || appliedVersions.some((version) => typeof version !== 'string' || !/^(\d{8}|\d{14})$/.test(version))
    || new Set(appliedVersions).size !== appliedVersions.length) {
    throw new Error('Applied migrations must be a JSON array of unique 8- or 14-digit version strings.');
  }
  const applied = new Set(appliedVersions);
  if (appliedVersions.some((version) => !inventory.some((item) => item.version === version))) {
    throw new Error('Applied history contains a version absent from this repository; reconcile history before release.');
  }
  let foundPending = false;
  for (const item of inventory) {
    if (!applied.has(item.version)) foundPending = true;
    else if (foundPending) throw new Error('Applied history has a gap before a later applied migration; reconcile history before release.');
  }
  return inventory.filter((item) => !applied.has(item.version));
}

async function main(args) {
  if (args.includes('--help')) {
    console.log('Usage: npm run seller-business:preflight --workspace=apps/pulse -- [--applied-migrations <history.json>]');
    console.log('Offline source verification; optionally plans pending SQL from an exported JSON array of applied version strings.');
    return;
  }
  if (args.length && (args.length !== 2 || args[0] !== '--applied-migrations' || !args[1])) {
    throw new Error('Only --applied-migrations <history.json> is supported. Use --help for usage.');
  }
  const root = fileURLToPath(new URL('../../../', import.meta.url));
  const manifest = JSON.parse((await readFile(resolve(root, 'apps/pulse/docs/SELLER_BUSINESS_RELEASE_SOURCE_MANIFEST.json'), 'utf8')).replace(/^\uFEFF/, ''));
  const migrationNames = (await readdir(resolve(root, migrationDirectory))).filter((name) => name.endsWith('.sql'));
  const result = await inspectSellerReleaseSources(manifest, migrationNames, (path) => readFile(resolve(root, path)));
  const pending = args.length ? planPendingSellerMigrations(migrationNames,
    JSON.parse((await readFile(resolve(args[1]), 'utf8')).replace(/^\uFEFF/, ''))) : null;
  console.log(JSON.stringify({
    status: 'LOCAL_COMPATIBILITY_VERIFIED',
    verifiedSourceCount: result.verifiedSourceCount,
    repositoryMigrationCount: result.inventory.length,
    compatibilityMigrations: result.compatibilityMigrations,
    pendingMigrations: pending,
    migrationHistoryCompared: pending !== null,
    hostedPreflight: 'PENDING_VERIFIED_NON_PRODUCTION_TARGET',
    scope: 'Offline compatibility verification and migration planning only; no SQL or deployment is executed. This does not certify a complete committed application candidate or hosted readiness.',
  }, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : 'Seller release preflight failed.');
    process.exitCode = 1;
  });
}
