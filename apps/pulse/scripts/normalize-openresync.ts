import path from 'path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import type { NormalizedMlsListing } from '@/lib/data/mlsTypes';
import { mapRawOpenResyncProperty } from '@/lib/data/openResyncMapper';

dotenv.config({ path: path.resolve(process.cwd(), '../../infra/openresync/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: false });
dotenv.config({ override: false });

const dryRun = process.argv.includes('--dry-run');
const databaseUrl = required('OPENRESYNC_RAW_DATABASE_URL');
const propertyTable = safeIdentifier(process.env.OPENRESYNC_PROPERTY_TABLE || 'sunset_Property');
const mediaTable = safeIdentifier(process.env.OPENRESYNC_MEDIA_TABLE || 'sunset_Media');
const maxRows = clamp(Number(process.env.OPENRESYNC_NORMALIZE_LIMIT || 2000), 1, 10000);
const batchSize = Math.min(250, maxRows);

async function main() {
  const pool = mysql.createPool({ uri: databaseUrl, connectionLimit: 4 });
  let run: any = null;
  let ledger: typeof import('@/lib/data/mlsSyncLedger') | null = null;

  try {
    await assertTableExists(pool, propertyTable);
    const mediaColumns = await getTableColumns(pool, mediaTable).catch(() => new Set<string>());

    if (!dryRun) {
      ledger = await import('@/lib/data/mlsSyncLedger');
      run = ledger.beginMlsSyncRun({
        provider: 'openresync',
        params: { propertyTable, mediaTable, maxRows },
      });
      await ledger.persistMlsSyncRun(run);
    }

    const { upsertCanonicalListing } = dryRun
      ? { upsertCanonicalListing: null }
      : await import('@/lib/data/listingRepository');

    let offset = 0;
    let processed = 0;
    const preview: NormalizedMlsListing[] = [];

    while (processed < maxRows) {
      const requested = Math.min(batchSize, maxRows - processed);
      const [rows] = await pool.query<any[]>(
        `SELECT * FROM \`${propertyTable}\` ORDER BY ModificationTimestamp ASC LIMIT ? OFFSET ?`,
        [requested, offset]
      );
      if (!rows.length) break;

      const mediaByListing = await loadMedia(pool, mediaTable, mediaColumns, rows);
      for (const row of rows) {
        const listing = mapRawOpenResyncProperty(row, mediaByListing);
        if (preview.length < 3) preview.push(listing);

        if (!dryRun && run && ledger && upsertCanonicalListing) {
          try {
            const result = await upsertCanonicalListing(listing);
            ledger.recordMlsSyncListing(run.id, { listing, outcome: result ? 'synced' : 'skipped' });
          } catch (error) {
            ledger.recordMlsSyncListing(run.id, { listing, outcome: 'failed', error });
          }
        }
        processed += 1;
      }

      offset += rows.length;
      if (rows.length < requested) break;
    }

    if (dryRun) {
      console.log(JSON.stringify({ dryRun: true, processed, preview }, null, 2));
      return;
    }

    const finished = ledger?.finishMlsSyncRun(run.id);
    if (!finished || !ledger) throw new Error('OpenRESync normalization run could not be finalized.');
    await ledger.persistMlsSyncRun(finished);
    console.log(JSON.stringify({ run: finished }, null, 2));
  } catch (error) {
    if (run && ledger) {
      const failed = ledger.finishMlsSyncRun(run.id, { status: 'failed', error });
      if (failed) await ledger.persistMlsSyncRun(failed);
    }
    throw error;
  } finally {
    await pool.end();
  }
}

async function loadMedia(
  pool: mysql.Pool,
  table: string,
  columns: Set<string>,
  propertyRows: Record<string, any>[]
) {
  const result = new Map<string, string[]>();
  if (!columns.size) return result;

  const foreignKey = ['ListingId', 'ResourceRecordKey', 'ResourceRecordID'].find((candidate) => columns.has(candidate));
  const urlColumn = ['MediaURL', 'MediaUrl', 'Uri640', 'Uri800', 'Uri1024', 'Uri1280', 'Uri1600'].find((candidate) => columns.has(candidate));
  if (!foreignKey || !urlColumn) return result;

  const ids = [...new Set(propertyRows.flatMap((row) => [row.ListingKey, row.ListingId]).filter(Boolean).map(String))];
  if (!ids.length) return result;
  const placeholders = ids.map(() => '?').join(',');
  const orderColumn = columns.has('Order') ? '`Order`' : columns.has('MediaOrder') ? '`MediaOrder`' : '1';
  const [mediaRows] = await pool.query<any[]>(
    `SELECT \`${foreignKey}\` AS listing_id, \`${urlColumn}\` AS media_url FROM \`${table}\` WHERE \`${foreignKey}\` IN (${placeholders}) ORDER BY ${orderColumn}`,
    ids
  );

  for (const media of mediaRows) {
    if (!media.listing_id || !media.media_url) continue;
    const key = String(media.listing_id);
    result.set(key, [...(result.get(key) || []), String(media.media_url)]);
  }
  return result;
}

async function assertTableExists(pool: mysql.Pool, table: string) {
  const columns = await getTableColumns(pool, table);
  if (!columns.size) throw new Error(`OpenRESync raw table ${table} is empty or unavailable.`);
}

async function getTableColumns(pool: mysql.Pool, table: string) {
  const [rows] = await pool.query<any[]>(`SHOW COLUMNS FROM \`${table}\``);
  return new Set(rows.map((row) => String(row.Field)));
}

function safeIdentifier(value: string) {
  if (!/^[A-Za-z0-9_]+$/.test(value)) throw new Error(`Unsafe MySQL identifier: ${value}`);
  return value;
}

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required. Copy infra/openresync/.env.example to .env and configure it.`);
  return value;
}

function clamp(value: number, min: number, max: number) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : min;
}

main().catch((error) => {
  console.error('[OPENRESYNC_NORMALIZE_FAILED]', error);
  process.exitCode = 1;
});
