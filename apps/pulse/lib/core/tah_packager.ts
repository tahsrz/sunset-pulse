import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { getCartridgeSearchQuery } from '@/lib/ai/brain/cartridge_query';
import { listPulseCartridges, type PulseCartridge } from '@/lib/ai/brain/pulse_query';
import { buildMemoriaPair } from './memoria_builder';
import { extractTextShardsFromCartridge, type ExtractedTextShard } from './tah_ingest';
import { MemoriaV4Builder, type MemoriaV4PlaceInput } from './memoria_v4';

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

  const builder = new MemoriaV4Builder(0.0001, options.maxShards || DEFAULT_MAX_SHARDS);

  const uniquePlacesMap = new Map<string, MemoriaV4PlaceInput>();
  let placeIdCounter = 1n;
  let sourceIdCounter = 1n;
  let shardIdCounter = 1n;

  let totalShardCount = 0;

  for (const cartridge of catalog) {
    try {
      const shards = extractTextShardsFromCartridge(cartridge)
        .map(shard => normalizeShard(cartridge, shard))
        .filter(shard => shard.text.length > 0);

      if (!shards.length) {
        skipped.push({ slug: cartridge.slug, name: cartridge.name, reason: 'No text shards extracted.' });
        continue;
      }

      const remaining = (options.maxShards || DEFAULT_MAX_SHARDS) - totalShardCount;
      if (remaining <= 0) {
        skipped.push({ slug: cartridge.slug, name: cartridge.name, reason: 'Max shard limit reached.' });
        continue;
      }

      const acceptedShards = shards.slice(0, remaining);
      const sourceId = sourceIdCounter++;
      const shardStart = shardIdCounter;
      
      let primaryPlaceId = 0n;

      acceptedShards.forEach(shard => {
        const fullText = formatPackedShard(cartridge, shard);
        const shardId = shardIdCounter++;

        // Parse place metadata if present
        let shardPlaceId = 0n;
        const placeMeta = parsePlaceFromShard(shard.text);
        if (placeMeta) {
          let existing = uniquePlacesMap.get(placeMeta.placeSlug);
          if (!existing) {
            existing = {
              placeId: placeIdCounter++,
              placeSlug: placeMeta.placeSlug,
              label: placeMeta.label,
              lat: placeMeta.lat,
              lng: placeMeta.lng,
              placeType: placeMeta.placeType,
              confidence: placeMeta.confidence,
              coverage: placeMeta.coverage,
              parentPlaceId: 0n,
              region: placeMeta.region || undefined,
              physicalAnchor: placeMeta.physicalAnchor || undefined,
              stage: placeMeta.stage || undefined
            };
            uniquePlacesMap.set(placeMeta.placeSlug, existing);
          }
          shardPlaceId = existing.placeId;
          if (primaryPlaceId === 0n) {
            primaryPlaceId = shardPlaceId;
          }
        }

        builder.addShard({
          shardId,
          sourceId,
          placeId: shardPlaceId,
          domainId: 1n, // default domain ID
          payloadType: 1, // Text
          compression: 0, // None
          qualityScore: 1.0,
          text: fullText
        });
      });

      builder.addSource({
        sourceId,
        sourceSlug: cartridge.slug,
        sourceName: cartridge.name,
        sourceType: cartridge.type === 'hat' ? 2 : 1, // 2 = memoria pair, 1 = indexed TAH
        sourcePathHash: BigInt('0x' + sha256(path.relative(process.cwd(), cartridge.path)).slice(0, 16)),
        sourceContentHash: hashFile(cartridge.path),
        importedUnixMs: BigInt(Date.now()),
        shardStart: BigInt(shardStart),
        shardCount: BigInt(acceptedShards.length),
        domainId: 1n,
        placeId: primaryPlaceId
      });

      totalShardCount += acceptedShards.length;
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

  if (totalShardCount === 0) {
    throw new Error('No cartridge shards were available to package.');
  }

  // Register places in builder
  uniquePlacesMap.forEach(place => {
    builder.addPlace(place);
  });

  const { hat, tah } = builder.forge();
  fs.mkdirSync(outputDir, { recursive: true });

  const hatPath = path.join(outputDir, `${baseName}.hat`);
  const tahPath = path.join(outputDir, `${baseName}.tah`);
  const manifestPath = path.join(outputDir, `${baseName}.manifest.json`);

  fs.writeFileSync(hatPath, hat);
  fs.writeFileSync(tahPath, tah);

  const stats = {
    bloomBits: BigInt(hat.length * 8).toString(),
    hashCount: builder['k'],
    headerByteSize: hat.length,
    payloadByteSize: tah.length
  };

  const manifest = {
    name: baseName,
    format: 'memoria-v4-super-cartridge',
    specTarget: 'TAH_MEMORIA_V4_SPEC.md',
    generatedAt: new Date().toISOString(),
    sourceCount: sourceManifests.length,
    skippedCount: skipped.length,
    shardCount: totalShardCount,
    stats,
    files: {
      hat: path.relative(process.cwd(), hatPath),
      tah: path.relative(process.cwd(), tahPath)
    },
    sources: sourceManifests,
    places: Array.from(uniquePlacesMap.values()).map(p => ({
      placeId: p.placeId.toString(),
      placeSlug: p.placeSlug,
      label: p.label,
      lat: p.lat,
      lng: p.lng,
      placeType: p.placeType,
      confidence: p.confidence,
      coverage: p.coverage,
      parentPlaceId: p.parentPlaceId.toString(),
      region: p.region || null,
      physicalAnchor: p.physicalAnchor || null,
      stage: p.stage || null
    })),
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
    shardCount: totalShardCount,
    skippedCount: skipped.length,
    files: {
      hatBytes: hat.length,
      tahBytes: tah.length,
      manifestBytes: fs.statSync(manifestPath).size
    },
    stats,
    sources: sourceManifests,
    skipped
  };
}

function parsePlaceFromShard(text: string) {
  const lines = text.split('\n');
  const fields: Record<string, string> = {};

  const pipeChunks = text.split('|');
  for (const chunk of pipeChunks) {
    const match = chunk.trim().match(/^([A-Z_]+):\s*(.*)$/);
    if (match) fields[match[1]] = match[2].trim();
  }

  for (const line of lines) {
    if (line.includes('|')) continue;
    const match = line.trim().match(/^([A-Z_]+):\s*(.*)$/);
    if (match) fields[match[1]] = match[2].trim();
  }

  if (!fields.PLACE) return null;

  const coordinates = fields.COORDINATES ? fields.COORDINATES.split(',').map(Number) : null;
  const lat = coordinates?.[0] && Number.isFinite(coordinates[0]) ? coordinates[0] : 0;
  const lng = coordinates?.[1] && Number.isFinite(coordinates[1]) ? coordinates[1] : 0;
  const confidence = fields.ATLAS_PULSE_BINDING ? Number(fields.ATLAS_PULSE_BINDING) : 100;
  const coverage = fields.ATLAS_PULSE_BINDING ? Number(fields.ATLAS_PULSE_BINDING) : 100;
  const placeSlug = fields.SLUG || fields.PLACE.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  return {
    label: fields.PLACE,
    placeSlug,
    lat,
    lng,
    placeType: fields.PLACE_TYPE === 'region' ? 6 : 1,
    confidence,
    coverage,
    parentPlaceId: 0n,
    region: fields.REGION || null,
    physicalAnchor: fields.PHYSICAL_ANCHOR || null,
    stage: fields.ATLAS_PULSE_STAGE || null
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
