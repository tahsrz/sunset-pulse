import fs from 'fs';
import path from 'path';
import { MemoriaRetriever } from './memoria_retriever';
import { readMemoriaV4Header, MemoriaV4Retriever, MemoriaV4SectionType } from './memoria_v4';

export interface TahMasterPaths {
  baseName: string;
  outputDir: string;
  hatPath: string;
  tahPath: string;
  manifestPath: string;
}

export interface TahMasterSearchInput {
  query: string;
  limit?: number | string;
}

export interface TahMasterListInput {
  q?: string;
  limit?: number | string;
  offset?: number | string;
}

const DEFAULT_MASTER_NAME = 'atlas_pulse_master';
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

export function getTahMasterPaths(): TahMasterPaths {
  const baseName = safeBaseName(process.env.PULSE_MASTER_ARCHIVE_NAME || DEFAULT_MASTER_NAME);
  const outputDir = path.resolve(
    process.env.PULSE_MASTER_ARCHIVE_DIR || path.join(process.cwd(), 'cartridges', 'master')
  );

  return {
    baseName,
    outputDir,
    hatPath: path.join(outputDir, `${baseName}.hat`),
    tahPath: path.join(outputDir, `${baseName}.tah`),
    manifestPath: path.join(outputDir, `${baseName}.manifest.json`)
  };
}

export function getTahMasterMetadata() {
  const paths = getTahMasterPaths();
  const manifest = readManifest(paths.manifestPath);
  const hatExists = fs.existsSync(paths.hatPath);
  const tahExists = fs.existsSync(paths.tahPath);

  return {
    status: hatExists && tahExists ? 'ready' : 'missing',
    name: manifest?.name || paths.baseName,
    format: manifest?.format || 'memoria-v3.5-super-cartridge',
    specTarget: manifest?.specTarget || 'TAH_MEMORIA_V4_SPEC.md',
    generatedAt: manifest?.generatedAt || null,
    sourceCount: manifest?.sourceCount || 0,
    skippedCount: manifest?.skippedCount || 0,
    shardCount: manifest?.shardCount || readShardCount(paths.hatPath),
    stats: manifest?.stats || readHeaderStats(paths.hatPath),
    files: {
      hat: fileStatus(paths.hatPath),
      tah: fileStatus(paths.tahPath),
      manifest: fileStatus(paths.manifestPath)
    },
    sources: manifest?.sources || [],
    skipped: manifest?.skipped || []
  };
}

export function assertTahMasterReady() {
  const paths = getTahMasterPaths();
  if (!fs.existsSync(paths.hatPath) || !fs.existsSync(paths.tahPath)) {
    throw new Error(`Master archive not found. Run npm run tah:pack-master to create ${paths.baseName}.hat/.tah.`);
  }
  return paths;
}

export function searchTahMaster(input: TahMasterSearchInput) {
  const query = String(input.query || '').trim();
  if (!query) {
    throw new Error('Query is required.');
  }

  if (query.length > 500) {
    throw new Error('Query must be 500 characters or fewer.');
  }

  const paths = assertTahMasterReady();
  const limit = normalizeLimit(input.limit);
  const retriever = new MemoriaRetriever(paths.hatPath);
  const matches = retriever.search(query, limit);

  return {
    query,
    limit,
    count: matches.length,
    archive: {
      name: paths.baseName,
      hat: path.relative(process.cwd(), paths.hatPath),
      tah: path.relative(process.cwd(), paths.tahPath)
    },
    results: matches.map((match, index) => ({
      rank: index + 1,
      score: match.score,
      ...parsePackedShard(match.data)
    }))
  };
}

export function listTahMasterSources(input: TahMasterListInput = {}) {
  assertTahMasterReady();
  const metadata = getTahMasterMetadata();
  const needle = String(input.q || '').trim().toLowerCase();
  const sources = (metadata.sources || []).filter((source: any) => {
    if (!needle) return true;
    return [
      source.slug,
      source.name,
      source.title,
      source.type,
      source.searchQuery
    ].join(' ').toLowerCase().includes(needle);
  });
  const offset = normalizeOffset(input.offset);
  const limit = normalizeLimit(input.limit);

  return {
    archive: {
      name: metadata.name,
      generatedAt: metadata.generatedAt,
      sourceCount: metadata.sourceCount,
      shardCount: metadata.shardCount
    },
    query: input.q || '',
    count: sources.length,
    limit,
    offset,
    sources: sources.slice(offset, offset + limit)
  };
}

export function listTahMasterPlaces(input: TahMasterListInput = {}) {
  const metadata = getTahMasterMetadata();
  const places = extractTahMasterPlaces();
  const needle = String(input.q || '').trim().toLowerCase();
  const filteredPlaces = places.filter(place => {
    if (!needle) return true;
    return [
      place.slug,
      place.label,
      place.region,
      place.physicalAnchor,
      place.source,
      place.title
    ].join(' ').toLowerCase().includes(needle);
  });
  const offset = normalizeOffset(input.offset);
  const limit = normalizeLimit(input.limit);
  const coverageAverage = filteredPlaces.length
    ? Math.round(filteredPlaces.reduce((sum, place) => sum + place.binding, 0) / filteredPlaces.length)
    : 0;

  return {
    archive: {
      name: metadata.name,
      generatedAt: metadata.generatedAt,
      sourceCount: metadata.sourceCount,
      shardCount: metadata.shardCount
    },
    query: input.q || '',
    count: filteredPlaces.length,
    coverageAverage,
    limit,
    offset,
    places: filteredPlaces.slice(offset, offset + limit)
  };
}

export function parsePackedShard(data: string) {
  const normalized = data.replace(/\r\n/g, '\n').trim();
  const lines = normalized.split('\n');
  const fields: Record<string, string> = {};
  let contentStart = -1;

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].trim();
    if (!line) continue;
    if (line === 'CONTENT:') {
      contentStart = index + 1;
      break;
    }

    const match = line.match(/^([A-Z_]+):\s*(.*)$/);
    if (!match) {
      contentStart = index;
      break;
    }

    fields[match[1]] = match[2];
  }

  if (contentStart >= 0) {
    return {
      source: fields.SOURCE || null,
      slug: fields.SLUG || null,
      title: fields.TITLE || null,
      searchQuery: fields.QUERY || null,
      text: lines.slice(contentStart).join('\n').trim()
    };
  }

  return parseFlattenedPackedShard(normalized);
}

function extractTahMasterPlaces() {
  const paths = assertTahMasterReady();
  const metadata = getTahMasterMetadata();

  if (metadata.format === 'memoria-v4-super-cartridge') {
    try {
      const header = readMemoriaV4Header(paths.hatPath);
      const placeSec = header.sections.find(s => s.type === MemoriaV4SectionType.PLACE_TABLE);
      if (placeSec && placeSec.length > 0n) {
        const retriever = new MemoriaV4Retriever(fs.readFileSync(paths.hatPath));
        const binaryPlaces = retriever.readPlaces(Number(placeSec.offset), Number(placeSec.itemCount));
        
        const manifest = readManifest(paths.manifestPath);
        const manifestPlaces = manifest?.places || [];

        return binaryPlaces.map(place => {
          const mPlace = manifestPlaces.find((mp: any) => mp.placeSlug === place.placeSlug);
          const binding = clampPercent(place.coverage);
          return {
            id: place.placeSlug,
            slug: place.placeSlug,
            label: place.label,
            region: mPlace?.region || (place.placeType === 6 ? 'Region' : null),
            physicalAnchor: mPlace?.physicalAnchor || null,
            lat: place.lat || null,
            lng: place.lng || null,
            binding,
            stage: mPlace?.stage || null,
            source: mPlace?.source || null,
            title: mPlace?.title || null,
            searchQuery: mPlace?.searchQuery || null,
            text: `PLACE: ${place.label} | COORDINATES: ${place.lat},${place.lng} | ATLAS_PULSE_BINDING: ${place.coverage}`
          };
        }).sort((a, b) => b.binding - a.binding || a.label.localeCompare(b.label));
      }
    } catch (err) {
      console.warn('Failed to parse binary PLACE_TABLE, falling back to legacy:', err);
    }
  }

  // Legacy fallback
  const shards = readMasterTextShards(paths);
  const places = new Map<string, any>();

  for (const shard of shards) {
    const parsed = parsePackedShard(shard);
    const fields = parseAtlasFields(parsed.text);
    const label = fields.PLACE;
    if (!label) continue;

    const coordinates = parseCoordinates(fields.COORDINATES);
    const slug = fields.SLUG || slugify(label);
    const key = slug || label.toLowerCase();
    const current = places.get(key);
    const binding = clampPercent(Number(fields.ATLAS_PULSE_BINDING || 0));
    const next = {
      id: key,
      slug,
      label,
      region: fields.REGION || null,
      physicalAnchor: fields.PHYSICAL_ANCHOR || null,
      lat: coordinates?.lat ?? null,
      lng: coordinates?.lng ?? null,
      binding,
      stage: fields.ATLAS_PULSE_STAGE || null,
      source: parsed.source,
      title: parsed.title,
      searchQuery: parsed.searchQuery,
      text: parsed.text
    };

    if (!current || next.binding > current.binding) {
      places.set(key, next);
    }
  }

  return [...places.values()].sort((a, b) => b.binding - a.binding || a.label.localeCompare(b.label));
}

function readMasterTextShards(paths: TahMasterPaths) {
  const hatBuffer = fs.readFileSync(paths.hatPath);
  const tahBuffer = fs.readFileSync(paths.tahPath);
  if (hatBuffer.length < 64) return [];

  const bloomBits = hatBuffer.readBigUInt64LE(8);
  const shardCount = hatBuffer.readUInt32LE(16);
  const indexOffset = 64 + Number((bloomBits + 7n) / 8n);
  const shards: string[] = [];

  for (let index = 0; index < shardCount; index++) {
    const entryOffset = indexOffset + index * 80;
    if (entryOffset + 80 > hatBuffer.length) break;
    if (hatBuffer.readUInt8(entryOffset) !== 0) continue;

    const dataOffset = Number(hatBuffer.readBigUInt64LE(entryOffset + 8));
    const length = hatBuffer.readUInt32LE(entryOffset + 16);
    if (length <= 0 || dataOffset < 0 || dataOffset + length > tahBuffer.length) continue;

    const text = tahBuffer
      .slice(dataOffset, dataOffset + length)
      .toString('utf-8')
      .replace(/\0+$/g, '')
      .trim();

    if (text.includes('PLACE:') || text.includes('ATLAS_PULSE_BINDING:')) {
      shards.push(text);
    }
  }

  return shards;
}

function parseAtlasFields(text: string) {
  const fields: Record<string, string> = {};
  const chunks = text.split('|');

  for (const chunk of chunks) {
    const match = chunk.trim().match(/^([A-Z_]+):\s*(.*)$/);
    if (match) fields[match[1]] = match[2].trim();
  }

  return fields;
}

function parseCoordinates(value?: string) {
  if (!value) return null;
  const [lat, lng] = value.split(',').map(part => Number(part.trim()));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function parseFlattenedPackedShard(data: string) {
  const source = data.match(/SOURCE:\s*(.*?)\s+SLUG:/)?.[1] || null;
  const slug = data.match(/SLUG:\s*(.*?)\s+TITLE:/)?.[1] || null;
  const title = data.match(/TITLE:\s*(.*?)\s+QUERY:/)?.[1] || null;
  const content = data
    .replace(/^SOURCE:\s*.*?\s+SLUG:\s*.*?\s+TITLE:\s*.*?\s+QUERY:\s*.*?(?=\s[A-Z][A-Za-z0-9])/s, '')
    .replace(/^CONTENT:\s*/, '')
    .trim();

  return {
    source,
    slug,
    title,
    searchQuery: null,
    text: content || data
  };
}

function normalizeLimit(value: TahMasterSearchInput['limit']) {
  const parsed = Number(value || DEFAULT_LIMIT);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(parsed), MAX_LIMIT);
}

function normalizeOffset(value: TahMasterListInput['offset']) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

function readManifest(manifestPath: string) {
  try {
    if (!fs.existsSync(manifestPath)) return null;
    return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch {
    return null;
  }
}

function readShardCount(hatPath: string) {
  return readHeaderStats(hatPath)?.shardCount || 0;
}

function readHeaderStats(hatPath: string) {
  try {
    if (!fs.existsSync(hatPath)) return null;
    const fd = fs.openSync(hatPath, 'r');
    const header = Buffer.alloc(64);
    fs.readSync(fd, header, 0, 64, 0);
    fs.closeSync(fd);

    return {
      hashCount: header.readUInt8(6),
      bloomBits: header.readBigUInt64LE(8).toString(),
      shardCount: header.readUInt32LE(16),
      avgComplexity: header.readUInt32LE(20)
    };
  } catch {
    return null;
  }
}

function fileStatus(filePath: string) {
  const exists = fs.existsSync(filePath);
  return {
    exists,
    path: path.relative(process.cwd(), filePath),
    byteSize: exists ? fs.statSync(filePath).size : 0
  };
}

function safeBaseName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || DEFAULT_MASTER_NAME;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}
