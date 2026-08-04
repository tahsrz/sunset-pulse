import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const execFileAsync = promisify(execFile);
const commit = process.argv.includes('--commit');
const requestedLimit = Number(argumentValue('--limit') || 25);
const insertLimit = Math.max(1, Math.min(Number.isFinite(requestedLimit) ? requestedLimit : 25, 100));
const runtimeDir = path.resolve(process.cwd(), 'cartridges', 'lead-intel', 'tad');
const statePath = path.join(runtimeDir, 'latest-run.json');

const candidateSchema = z.object({
  account_number: z.string().min(1),
  owner_name: z.string().min(1),
  property_address: z.string().min(1),
  mailing_address: z.string().min(1),
  deed_date: z.string(),
  years_held: z.number(),
  total_value: z.number(),
  appraisal_year: z.string(),
  property_class: z.literal('A'),
  gis_link: z.string(),
  score: z.number(),
  reasons: z.array(z.string()),
});

const workerPayloadSchema = z.object({
  status: z.literal('completed'),
  source_url: z.string().url(),
  source_last_modified: z.string().nullable().optional(),
  source_downloaded_at: z.string().nullable().optional(),
  source_byte_size: z.number(),
  used_cached_export: z.boolean(),
  scanned_records: z.number(),
  eligible_records: z.number(),
  candidate_count: z.number(),
  filters: z.record(z.unknown()),
  candidates: z.array(candidateSchema),
});

async function main() {
  fs.mkdirSync(runtimeDir, { recursive: true });
  writeState({ status: 'running', startedAt: new Date().toISOString(), commit, insertLimit });

  const python = process.env.LEAD_INTEL_PYTHON || 'python';
  const worker = path.resolve(process.cwd(), 'workers', 'lead-intel-crawler', 'tad_bulk_discovery.py');
  const { stdout } = await execFileAsync(python, [
    worker,
    '--cache-dir', runtimeDir,
    '--candidate-limit', String(Math.max(insertLimit * 10, 250)),
  ], {
    cwd: process.cwd(),
    timeout: 15 * 60 * 1000,
    maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
  });
  const payload = workerPayloadSchema.parse(JSON.parse(stdout.trim()));

  const { supabaseAdmin } = await import('../lib/supabase');
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('leads')
    .select('metadata')
    .eq('source', 'internal_prospecting')
    .limit(10000);
  if (existingError) throw new Error(existingError.message);

  const existingAccountNumbers = new Set(
    (existing || [])
      .map((lead) => lead.metadata?.discovery?.externalId)
      .filter((value): value is string => typeof value === 'string'),
  );
  const availableCandidates = payload.candidates
    .filter((candidate) => !existingAccountNumbers.has(candidate.account_number));
  const selected = availableCandidates.slice(0, insertLimit);

  let inserted = 0;
  if (commit && selected.length) {
    const discoveredAt = new Date().toISOString();
    const { error } = await supabaseAdmin.from('leads').insert(selected.map((candidate) => ({
      name: candidate.owner_name,
      property_address: candidate.property_address,
      mailing_address: candidate.mailing_address,
      status: 'research',
      prospecting_source: 'absentee_owner',
      source: 'internal_prospecting',
      metadata: {
        entryMode: 'automated_discovery',
        discovery: {
          source: 'tad_property_export',
          externalId: candidate.account_number,
          discoveredAt,
          sourceUrl: payload.source_url,
          sourceLastModified: payload.source_last_modified || null,
          appraisalYear: candidate.appraisal_year,
          deedDate: candidate.deed_date,
          yearsHeld: candidate.years_held,
          totalValue: candidate.total_value,
          propertyClass: candidate.property_class,
          gisLink: candidate.gis_link || null,
          score: candidate.score,
          reasons: candidate.reasons,
          filters: payload.filters,
        },
      },
    })));
    if (error) throw new Error(error.message);
    inserted = selected.length;
  }

  const result = {
    status: 'completed',
    completedAt: new Date().toISOString(),
    mode: commit ? 'commit' : 'dry_run',
    scannedRecords: payload.scanned_records,
    eligibleRecords: payload.eligible_records,
    rankedCandidates: payload.candidate_count,
    duplicateCandidates: payload.candidates.length - availableCandidates.length,
    selectedCandidates: selected.length,
    insertedLeads: inserted,
    usedCachedExport: payload.used_cached_export,
    sourceLastModified: payload.source_last_modified || null,
  };
  writeState(result);
  console.log(JSON.stringify(result, null, 2));
}

function writeState(value: Record<string, unknown>) {
  fs.writeFileSync(statePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function argumentValue(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

main().catch((error) => {
  const result = {
    status: 'failed',
    failedAt: new Date().toISOString(),
    error: error instanceof Error ? error.message : 'TAD discovery failed',
  };
  fs.mkdirSync(runtimeDir, { recursive: true });
  writeState(result);
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
});
