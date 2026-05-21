import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getCartridgeSearchQuery } from '@/lib/ai/brain/cartridge_query';
import { listPulseCartridges, type PulseCartridge } from '@/lib/ai/brain/pulse_query';
import { buildMemoriaPair } from './memoria_builder';
import { extractTextShardsFromCartridge, type ExtractedTextShard } from './tah_ingest';

export interface PackPulseCatalogOptions {
  baseName?: string;
  outputDir?: string;
  cartridges?: PulseCartridge[];
  includeSlugs?: string[];
  excludeSlugs?: string[];
  maxShards?: number;
}

export interface PackedSourceManifest {
  slug: string;
  name: string;
  title: string;
  type: PulseCartridge['type'];
  searchQuery: string;
  sourcePathHash: string;
  contentHash: string;
  shardCount: number;
}

export interface PackPulseCatalogResult {
  baseName: string;
  outputDir: string;
  hatPath: string;
  tahPath: string;
  manifestPath: string;
  sourceCount: number;
  shardCount: number;
  skippedCount: number;
  files: {
    hatBytes: number;
    tahBytes: number;
    manifestBytes: number;
  };
  stats: {
    bloomBits: string;
    hashCount: number;
    headerByteSize: number;
    payloadByteSize: number;
  };
  sources: PackedSourceManifest[];
  skipped: Array<{ slug: string; name: string; reason: string }>;
}

const DEFAULT_BASE_NAME = 'atlas_pulse_master';
const DEFAULT_MAX_SHARDS = 50000;

export function packPulseCatalog(options: PackPulseCatalogOptions = {}): PackPulseCatalogResult {
  const baseName = safeBaseName(options.baseName || DEFAULT_BASE_NAME);
  const outputDir = path.resolve(options.outputDir || path.join(process.cwd(), 'cartridges', 'master'));
  const includeSlugs = new Set((options.includeSlugs || []).map(normalizeSlug));
  const excludeSlugs = new Set([
    normalizeSlug(baseName),
    ...((options.excludeSlugs || []).map(normalizeSlug))
  ]);
  const catalog = (options.cartridges || listPulseCartridges())
    .filter(cartridge => includeSlugs.size === 0 || includeSlugs.has(cartridge.slug))
    .filter(cartridge => !excludeSlugs.has(cartridge.slug))
    .filter(cartridge => !isOutputArtifact(cartridge, baseName));

  const sourceManifests: PackedSourceManifest[] = [];
  const skipped: Array<{ slug: string; name: string; reason: string }> = [];
  const memoriaInputs: Array<{ text: string; meta?: number }> = [];
  let shardCount = 0;

  for (const cartridge of catalog) {
    try {
      const shards = extractTextShardsFromCartridge(cartridge)
        .map(shard => normalizeShard(cartridge, shard))
        .filter(shard => shard.text.length > 0);

      if (!shards.length) {
        skipped.push({ slug: cartridge.slug, name: cartridge.name, reason: 'No text shards extracted.' });
        continue;
      }

      const remaining = (options.maxShards || DEFAULT_MAX_SHARDS) - memoriaInputs.length;
      if (remaining <= 0) {
        skipped.push({ slug: cartridge.slug, name: cartridge.name, reason: 'Max shard limit reached.' });
        continue;
      }

      const acceptedShards = shards.slice(0, remaining);
      memoriaInputs.push(...acceptedShards.map(shard => ({
        text: formatPackedShard(cartridge, shard),
        meta: shard.meta
      })));

      shardCount += acceptedShards.length;
      sourceManifests.push({
        slug: cartridge.slug,
        name: cartridge.name,
        title: cartridge.title,
        type: cartridge.type,
        searchQuery: getCartridgeSearchQuery(cartridge),
        sourcePathHash: sha256(path.relative(process.cwd(), cartridge.path)),
        contentHash: hashFile(cartridge.path),
        shardCount: acceptedShards.length
      });
    } catch (error: any) {
      skipped.push({
        slug: cartridge.slug,
        name: cartridge.name,
        reason: error.message || 'Extraction failed.'
      });
    }
  }

  if (!memoriaInputs.length) {
    throw new Error('No cartridge shards were available to package.');
  }

  const memoria = buildMemoriaPair(memoriaInputs);
  fs.mkdirSync(outputDir, { recursive: true });

  const hatPath = path.join(outputDir, `${baseName}.hat`);
  const tahPath = path.join(outputDir, `${baseName}.tah`);
  const manifestPath = path.join(outputDir, `${baseName}.manifest.json`);

  fs.writeFileSync(hatPath, memoria.hat);
  fs.writeFileSync(tahPath, memoria.tah);

  const manifest = {
    name: baseName,
    format: 'memoria-v3.5-super-cartridge',
    specTarget: 'TAH_MEMORIA_V4_SPEC.md',
    generatedAt: new Date().toISOString(),
    sourceCount: sourceManifests.length,
    skippedCount: skipped.length,
    shardCount,
    stats: memoria.stats,
    files: {
      hat: path.relative(process.cwd(), hatPath),
      tah: path.relative(process.cwd(), tahPath)
    },
    sources: sourceManifests,
    skipped
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  return {
    baseName,
    outputDir,
    hatPath,
    tahPath,
    manifestPath,
    sourceCount: sourceManifests.length,
    shardCount,
    skippedCount: skipped.length,
    files: {
      hatBytes: fs.statSync(hatPath).size,
      tahBytes: fs.statSync(tahPath).size,
      manifestBytes: fs.statSync(manifestPath).size
    },
    stats: memoria.stats,
    sources: sourceManifests,
    skipped
  };
}

function normalizeShard(cartridge: PulseCartridge, shard: ExtractedTextShard): ExtractedTextShard {
  return {
    source: shard.source || cartridge.name,
    text: shard.text.replace(/\s+/g, ' ').trim(),
    meta: shard.meta
  };
}

function formatPackedShard(cartridge: PulseCartridge, shard: ExtractedTextShard) {
  return [
    `SOURCE: ${cartridge.name}`,
    `SLUG: ${cartridge.slug}`,
    `TITLE: ${cartridge.title}`,
    `QUERY: ${getCartridgeSearchQuery(cartridge)}`,
    '',
    'CONTENT:',
    shard.text
  ].join('\n');
}

function isOutputArtifact(cartridge: PulseCartridge, baseName: string) {
  const normalizedName = cartridge.name.toLowerCase();
  return normalizedName === `${baseName}.hat` || normalizedName === `${baseName}.tah`;
}

function hashFile(filePath: string) {
  try {
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
  } catch {
    return '';
  }
}

function sha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function safeBaseName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || DEFAULT_BASE_NAME;
}

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
