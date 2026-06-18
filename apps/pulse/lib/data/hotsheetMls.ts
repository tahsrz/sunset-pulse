import fs from 'fs/promises';
import { syncPropertyToIntelligenceGrid } from '@/lib/intelligence/propertySync';
import {
  beginMlsSyncRun,
  finishMlsSyncRun,
  recordMlsSyncListing,
  type MlsSyncRun,
} from './mlsSyncLedger';
import type { NormalizedMlsListing } from './mlsTypes';

const SYSTEM_OWNER = '650c8e2b1f4e1a2b3c4d5e6f';

export type HotsheetImportResult = {
  run: MlsSyncRun;
  listings: NormalizedMlsListing[];
};

export async function importHotsheetFile(filePath: string): Promise<HotsheetImportResult> {
  const text = await fs.readFile(filePath, 'utf8');
  return importHotsheetText(text, { filePath });
}

export async function importHotsheetText(text: string, params: Record<string, any> = {}): Promise<HotsheetImportResult> {
  const run = beginMlsSyncRun({ provider: 'hotsheet', params });
  const listings = parseHotsheetText(text);

  try {
    for (const listing of listings) {
      try {
        const result = await syncPropertyToIntelligenceGrid(listing);
        recordMlsSyncListing(run.id, {
          listing,
          outcome: result ? 'synced' : 'skipped',
        });
      } catch (error) {
        recordMlsSyncListing(run.id, {
          listing,
          outcome: 'failed',
          error,
        });
      }
    }

    const finished = finishMlsSyncRun(run.id);
    if (!finished) throw new Error('Hotsheet import did not create a run ledger entry.');
    return { run: finished, listings };
  } catch (error) {
    finishMlsSyncRun(run.id, { status: 'failed', error });
    throw error;
  }
}

export function parseHotsheetText(text: string): NormalizedMlsListing[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const mlsLineIndices = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (/^MLS#\s*[0-9A-Z-]+\s*-/.test(lines[index])) mlsLineIndices.push(index);
  }

  return mlsLineIndices
    .map((start, index) => parseEntry(lines, start, index + 1 < mlsLineIndices.length ? mlsLineIndices[index + 1] : lines.length))
    .filter(Boolean) as NormalizedMlsListing[];
}

function parseEntry(lines: string[], mlsLineIndex: number, nextMlsLineIndex: number): NormalizedMlsListing | null {
  const mlsMatch = lines[mlsLineIndex].match(/^MLS#\s*([0-9A-Z-]+)\s*-\s*(.+)$/i);
  if (!mlsMatch) return null;

  const mlsId = mlsMatch[1].trim();
  const listingType = mlsMatch[2].trim();
  const lowerType = listingType.toLowerCase();
  const priceType = lowerType.includes('lease') ? 'lease' : 'sale';
  const cityLineIdx = findCityStateZipLineIndex(lines, mlsLineIndex - 1);
  const street = cityLineIdx > 0 ? lines[cityLineIdx - 1].trim() : 'Unknown Address';
  const cityStateZip = cityLineIdx >= 0 ? lines[cityLineIdx].trim() : '';
  const cityStateZipMatch = cityStateZip.match(/^([^,]+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);

  let listingStatus = 'Active';
  let price: number | null = null;
  let beds: number | null = null;
  let baths: number | null = null;
  let dom: number | null = null;
  let subdivision = '';
  let county = '';
  let hotsheetDate = '';

  for (let index = mlsLineIndex + 1; index < nextMlsLineIndex; index += 1) {
    const line = lines[index];
    if (/^(Active|Pending|Cancelled|Closed)$/i.test(line)) listingStatus = line;
    if (/^\$[\d,]+(?:\.\d{2})?$/.test(line)) price = parsePrice(line);
    if (/^Beds:/i.test(line)) beds = parseNumberFromLine(line, 'Beds');
    if (/^Baths:/i.test(line)) baths = parseNumberFromLine(line, 'Baths');
    if (/^DOM:/i.test(line)) dom = parseNumberFromLine(line, 'DOM');
    if (/^Subdivision Name -/i.test(line)) subdivision = line.replace(/^Subdivision Name -/i, '').trim();
    if (/^County Or Parish -/i.test(line)) county = line.replace(/^County Or Parish -/i, '').trim();
    if (/^Hotsheet Date:/i.test(line)) hotsheetDate = line.replace(/^Hotsheet Date:/i, '').trim();
  }

  return {
    owner: SYSTEM_OWNER,
    _id: mlsId,
    name: street,
    type: listingType,
    description: `Imported from Daily Hotsheet (${hotsheetDate || 'unknown date'})`,
    location: {
      street,
      city: cityStateZipMatch?.[1]?.trim() || '',
      state: cityStateZipMatch?.[2]?.trim() || '',
      zipcode: cityStateZipMatch?.[3]?.trim() || '',
    },
    beds: beds ?? undefined,
    baths: baths ?? undefined,
    list_price: price ?? undefined,
    price: priceType === 'sale' ? price ?? undefined : undefined,
    price_type: priceType,
    rates: {
      monthly: priceType === 'lease' ? price ?? undefined : undefined,
    },
    source: 'MLS',
    mls_id: mlsId,
    listing_status: listingStatus,
    last_updated: hotsheetDate || new Date().toISOString().slice(0, 10),
    neighborhood_recon: {
      subdivision: subdivision || null,
      county: county || null,
      dom: dom ?? null,
      hotsheetDate: hotsheetDate || null,
      importedFrom: 'daily_hotsheet_text',
    },
    metadata: {
      provider: 'hotsheet',
      resource: 'daily_hotsheet_text',
      listDate: hotsheetDate || null,
      modificationTimestamp: hotsheetDate || null,
    },
  };
}

function parsePrice(value: string) {
  const numeric = Number(value.replace(/[$,]/g, '').trim());
  return Number.isFinite(numeric) ? numeric : null;
}

function parseNumberFromLine(line: string, label: string) {
  const match = line.match(new RegExp(`^${label}:\\s*(\\d+)`, 'i'));
  return match ? Number(match[1]) : null;
}

function findCityStateZipLineIndex(lines: string[], startIndex: number) {
  for (let index = startIndex; index >= 0; index -= 1) {
    if (/^[^,]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?$/.test(lines[index])) return index;
  }
  return -1;
}
