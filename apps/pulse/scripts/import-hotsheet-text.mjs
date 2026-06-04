import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import connectDB from '../lib/core/database.js';
import Property from '../models/Property.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SYSTEM_OWNER = '650c8e2b1f4e1a2b3c4d5e6f';

function parsePrice(value) {
  if (!value) return null;
  const numeric = Number(value.replace(/[$,]/g, '').trim());
  return Number.isFinite(numeric) ? numeric : null;
}

function parseNumberFromLine(line, label) {
  const match = line.match(new RegExp(`^${label}:\\s*(\\d+)`, 'i'));
  return match ? Number(match[1]) : null;
}

function findCityStateZipLineIndex(lines, startIndex) {
  for (let i = startIndex; i >= 0; i -= 1) {
    if (/^[^,]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?$/.test(lines[i])) return i;
  }
  return -1;
}

function parseEntry(lines, mlsLineIndex, nextMlsLineIndex) {
  const mlsMatch = lines[mlsLineIndex].match(/^MLS#\s*([0-9]+)\s*-\s*(.+)$/i);
  if (!mlsMatch) return null;

  const mlsId = mlsMatch[1].trim();
  const listingType = mlsMatch[2].trim();
  const lowerType = listingType.toLowerCase();
  const priceType = lowerType.includes('lease') ? 'lease' : 'sale';

  const cityLineIdx = findCityStateZipLineIndex(lines, mlsLineIndex - 1);
  const street = cityLineIdx > 0 ? lines[cityLineIdx - 1].trim() : 'Unknown Address';
  const cityStateZip = cityLineIdx >= 0 ? lines[cityLineIdx].trim() : '';

  let city = '';
  let state = '';
  let zipcode = '';
  const cszMatch = cityStateZip.match(/^([^,]+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
  if (cszMatch) {
    city = cszMatch[1].trim();
    state = cszMatch[2].trim();
    zipcode = cszMatch[3].trim();
  }

  let listingStatus = 'Active';
  let price = null;
  let beds = null;
  let baths = null;
  let dom = null;
  let subdivision = '';
  let county = '';
  let hotsheetDate = '';

  for (let i = mlsLineIndex + 1; i < nextMlsLineIndex; i += 1) {
    const line = lines[i];
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
    name: street,
    type: listingType,
    description: `Imported from Daily Hotsheet (${hotsheetDate || 'unknown date'})`,
    location: {
      street,
      city,
      state,
      zipcode,
    },
    beds: beds ?? undefined,
    baths: baths ?? undefined,
    list_price: price ?? undefined,
    price_type: priceType,
    rates: {
      monthly: priceType === 'lease' ? price ?? undefined : undefined,
    },
    source: 'MLS',
    mls_id: mlsId,
    listing_status: listingStatus,
    neighborhood_recon: {
      subdivision: subdivision || null,
      county: county || null,
      dom: dom ?? null,
      hotsheetDate: hotsheetDate || null,
      importedFrom: 'daily_hotsheet_text',
    },
    last_updated: hotsheetDate || new Date().toISOString().slice(0, 10),
  };
}

async function importHotsheet(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const mlsLineIndices = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (/^MLS#\s*[0-9]+\s*-/.test(lines[i])) mlsLineIndices.push(i);
  }

  const listings = [];
  for (let i = 0; i < mlsLineIndices.length; i += 1) {
    const start = mlsLineIndices[i];
    const end = i + 1 < mlsLineIndices.length ? mlsLineIndices[i + 1] : lines.length;
    const parsed = parseEntry(lines, start, end);
    if (parsed?.mls_id) listings.push(parsed);
  }

  await connectDB();

  let inserted = 0;
  let updated = 0;

  for (const listing of listings) {
    const existing = await Property.findOne({ mls_id: listing.mls_id }).select('_id');
    await Property.findOneAndUpdate(
      { mls_id: listing.mls_id },
      { $set: listing },
      { upsert: true, new: true, runValidators: true }
    );
    if (existing) updated += 1;
    else inserted += 1;
  }

  console.log(`Imported listings: ${listings.length}`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Updated: ${updated}`);
}

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node scripts/import-hotsheet-text.mjs <absolute-or-relative-text-file-path>');
  process.exit(1);
}

importHotsheet(path.resolve(process.cwd(), inputPath))
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Hotsheet import failed:', error);
    process.exit(1);
  });
