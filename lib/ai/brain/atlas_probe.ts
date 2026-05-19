import fs from 'fs';
import path from 'path';
import { getCartridgeSearchQuery } from '@/lib/ai/brain/cartridge_query';
import { listPulseCartridges, type PulseCartridge } from '@/lib/ai/brain/pulse_query';

const MAX_PROBE_LIMIT = 25;
const DEFAULT_PROBE_LIMIT = 12;
const SAMPLE_BYTES = 2048;

export type AtlasProbeItem = {
  slug: string;
  title: string;
  source: string;
  type: PulseCartridge['type'];
  searchQuery: string;
  byteSize: number;
  payloadByteSize: number;
  shardCount: number;
  bloomBits: string;
  hashCount: number;
  format: 'memoria-pair' | 'indexed-tah' | 'swarm-stream' | 'unknown';
  summary: string;
};

export function buildAtlasProbe(cursor = 0, limit = DEFAULT_PROBE_LIMIT) {
  const cartridges = listPulseCartridges();
  const safeCursor = Math.max(0, Math.min(cursor, cartridges.length));
  const safeLimit = Math.max(1, Math.min(limit, MAX_PROBE_LIMIT));
  const batch = cartridges.slice(safeCursor, safeCursor + safeLimit);
  const nextCursor = safeCursor + batch.length;

  return {
    generatedAt: new Date().toISOString(),
    cursor: safeCursor,
    nextCursor: nextCursor >= cartridges.length ? null : nextCursor,
    limit: safeLimit,
    total: cartridges.length,
    mapped: nextCursor,
    percent: cartridges.length === 0 ? 0 : Math.round((nextCursor / cartridges.length) * 100),
    done: nextCursor >= cartridges.length,
    items: batch.map(probeCartridge)
  };
}

function probeCartridge(cartridge: PulseCartridge): AtlasProbeItem {
  const header = readHeader(cartridge.path);
  const payloadPath = cartridge.type === 'hat' ? resolvePairedTahPath(cartridge.path) : cartridge.path;
  const payloadStats = statSafe(payloadPath);
  const format = classifyFormat(cartridge, header.magic);
  const searchQuery = getCartridgeSearchQuery(cartridge);

  return {
    slug: cartridge.slug,
    title: cartridge.title,
    source: cartridge.name,
    type: cartridge.type,
    searchQuery,
    byteSize: statSafe(cartridge.path),
    payloadByteSize: payloadStats,
    shardCount: header.shardCount,
    bloomBits: header.bloomBits,
    hashCount: header.hashCount,
    format,
    summary: summarizePayload(payloadPath, searchQuery)
  };
}

function readHeader(filePath: string) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const header = Buffer.alloc(64);
    const bytesRead = fs.readSync(fd, header, 0, 64, 0);
    fs.closeSync(fd);

    if (bytesRead < 20) {
      return emptyHeader();
    }

    return {
      magic: header.readUInt32LE(0),
      hashCount: header.readUInt8(6),
      bloomBits: header.readBigUInt64LE(8).toString(),
      shardCount: header.readUInt32LE(16)
    };
  } catch {
    return emptyHeader();
  }
}

function emptyHeader() {
  return {
    magic: 0,
    hashCount: 0,
    bloomBits: '0',
    shardCount: 0
  };
}

function classifyFormat(cartridge: PulseCartridge, magic: number): AtlasProbeItem['format'] {
  if (cartridge.type === 'hat') return 'memoria-pair';
  if (magic === 0x54414821) return 'indexed-tah';
  if (statSafe(cartridge.path) > 0) return 'swarm-stream';
  return 'unknown';
}

function resolvePairedTahPath(hatPath: string) {
  if (hatPath.endsWith('.tah.hat')) {
    return `${hatPath.slice(0, -8)}.tah.tah`;
  }

  return path.join(path.dirname(hatPath), `${path.basename(hatPath, '.hat')}.tah`);
}

function statSafe(filePath: string) {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

function summarizePayload(payloadPath: string, fallback: string) {
  try {
    if (!fs.existsSync(payloadPath)) return fallback;
    const fd = fs.openSync(payloadPath, 'r');
    const buffer = Buffer.alloc(SAMPLE_BYTES);
    const bytesRead = fs.readSync(fd, buffer, 0, SAMPLE_BYTES, 0);
    fs.closeSync(fd);

    const text = buffer
      .subarray(0, bytesRead)
      .toString('utf8')
      .replace(/\0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!text) return fallback;
    return text.slice(0, 240);
  } catch {
    return fallback;
  }
}
