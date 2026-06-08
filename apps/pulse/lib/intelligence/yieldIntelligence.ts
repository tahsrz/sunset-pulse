import 'server-only';

import fs from 'fs';
import path from 'path';

export type YieldIntensity = 'HIGH' | 'MODERATE' | 'LOW';

export type YieldIntelligenceRecord = {
  county: string;
  fips: string;
  cornYield: number;
  wheatYield: number;
  latestYear: number;
  productivityScore: number;
  intensity: YieldIntensity;
  confidence: number;
  source: string;
  lastUpdated: string;
};

type RawYieldRecord = {
  county: string;
  fips: string;
  cornYield: number;
  wheatYield: number;
  latestYear: number;
};

const YIELD_DATA_PATH = path.join(process.cwd(), 'private', 'yield_intelligence.json');
const SOURCE_LABEL = 'USDA county crop yield snapshot, normalized by Sunset Pulse yield forge';

export function listYieldIntelligence(): YieldIntelligenceRecord[] {
  const raw = readRawYieldData();
  return raw.map(enrichYieldRecord).sort((a, b) => a.county.localeCompare(b.county));
}

export function getYieldIntelligenceByCounty(county: string) {
  const normalizedCounty = normalizeCounty(county);
  if (!normalizedCounty) return null;

  return listYieldIntelligence().find((record) => normalizeCounty(record.county) === normalizedCounty) || null;
}

function readRawYieldData(): RawYieldRecord[] {
  if (!fs.existsSync(YIELD_DATA_PATH)) return [];

  const parsed = JSON.parse(fs.readFileSync(YIELD_DATA_PATH, 'utf8'));
  if (!Array.isArray(parsed)) return [];

  return parsed.filter((record): record is RawYieldRecord => (
    typeof record?.county === 'string' &&
    typeof record?.fips === 'string' &&
    typeof record?.cornYield === 'number' &&
    typeof record?.wheatYield === 'number' &&
    typeof record?.latestYear === 'number'
  ));
}

function enrichYieldRecord(record: RawYieldRecord): YieldIntelligenceRecord {
  const productivityScore = calculateProductivityScore(record);

  return {
    ...record,
    productivityScore,
    intensity: getIntensity(productivityScore),
    confidence: getConfidence(record.latestYear),
    source: SOURCE_LABEL,
    lastUpdated: new Date(`${record.latestYear}-12-31T00:00:00.000Z`).toISOString(),
  };
}

function calculateProductivityScore(record: RawYieldRecord) {
  const cornScore = (record.cornYield / 150) * 100;
  const wheatScore = (record.wheatYield / 80) * 100;
  return Math.round((cornScore * 0.6) + (wheatScore * 0.4));
}

function getIntensity(score: number): YieldIntensity {
  if (score > 60) return 'HIGH';
  if (score > 30) return 'MODERATE';
  return 'LOW';
}

function getConfidence(latestYear: number) {
  const age = Math.max(0, new Date().getFullYear() - latestYear);
  return Math.max(45, Math.min(95, 95 - age * 12));
}

function normalizeCounty(county: string) {
  return county.toLowerCase().replace(/\bcounty\b/g, '').replace(/[^a-z0-9]+/g, '').trim();
}
