import fs from 'fs';
import path from 'path';
import { getCartridgeApiUrl, getCartridgeSearchQuery } from '@/lib/ai/brain/cartridge_query';
import { CARTRIDGE_DOMAINS, type CartridgeDomain } from '@/lib/ai/brain/cartridge_domains';
import type { PulseCartridge } from '@/lib/ai/brain/pulse_query';
import { TAHRetriever } from '@/lib/core/tah_retriever';

const SAMPLE_BYTES = 2048;

export type CartridgeMetadata = {
  slug: string;
  title: string;
  displayTitle: string;
  source: string;
  type: PulseCartridge['type'];
  path: string;
  domain: {
    id: string;
    label: string;
    color: string;
  };
  searchQuery: string;
  byteSize: number;
  payloadByteSize: number;
  shardCount: number;
  bloomBits: string;
  hashCount: number;
  format: 'memoria-pair' | 'indexed-tah' | 'swarm-stream' | 'unknown';
  summary: string;
  routes: {
    html: string;
    headless: string;
    api: string;
    meta: string;
  };
};

export function getCartridgeMetadata(cartridge: PulseCartridge, host = 'https://sunsetpulse.com'): CartridgeMetadata {
  const header = readHeader(cartridge.path);
  const payloadPath = cartridge.type === 'hat' ? resolvePairedTahPath(cartridge.path) : cartridge.path;
  const format = classifyFormat(cartridge, header.magic);
  const searchQuery = getCartridgeSearchQuery(cartridge);
  const summary = summarizePayload(payloadPath, searchQuery, format);
  const domain = classifyCartridgeDomain(cartridge, searchQuery, summary);

  return {
    slug: cartridge.slug,
    title: cartridge.title,
    displayTitle: displayTitleFor(cartridge, searchQuery),
    source: cartridge.name,
    type: cartridge.type,
    path: cartridge.path,
    domain: {
      id: domain.id,
      label: domain.label,
      color: domain.color
    },
    searchQuery,
    byteSize: statSafe(cartridge.path),
    payloadByteSize: statSafe(payloadPath),
    shardCount: header.shardCount,
    bloomBits: header.bloomBits,
    hashCount: header.hashCount,
    format,
    summary,
    routes: {
      html: `${host}/tah/${cartridge.slug}`,
      headless: `${host}/tah/${cartridge.slug}/headless`,
      api: getCartridgeApiUrl(host, cartridge),
      meta: `${host}/api/tah/${cartridge.slug}/meta`
    }
  };
}

export function classifyCartridgeDomain(cartridge: PulseCartridge, searchQuery = '', summary = '') {
  const haystack = `${cartridge.slug} ${cartridge.title} ${cartridge.name} ${searchQuery} ${summary}`.toLowerCase();
  return CARTRIDGE_DOMAINS.find(rule => rule.keywords.some(keyword => haystack.includes(keyword))) || CARTRIDGE_DOMAINS[CARTRIDGE_DOMAINS.length - 1];
}

export function summarizePayload(payloadPath: string, fallback: string, format: CartridgeMetadata['format']) {
  if (format === 'indexed-tah') {
    const shardSummary = summarizeIndexedTah(payloadPath);
    if (shardSummary) return shardSummary;
  }

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

    if (!text || looksBinary(text)) return fallback;
    return text.slice(0, 240);
  } catch {
    return fallback;
  }
}

export function resolvePairedTahPath(hatPath: string) {
  if (hatPath.endsWith('.tah.hat')) {
    return `${hatPath.slice(0, -8)}.tah.tah`;
  }

  return path.join(path.dirname(hatPath), `${path.basename(hatPath, '.hat')}.tah`);
}

function displayTitleFor(cartridge: PulseCartridge, searchQuery: string) {
  if (/^web-\d+$/.test(cartridge.slug) && searchQuery && !/^web\s+\d+$/i.test(searchQuery)) {
    return searchQuery;
  }

  return cartridge.title;
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

function classifyFormat(cartridge: PulseCartridge, magic: number): CartridgeMetadata['format'] {
  if (cartridge.type === 'hat') return 'memoria-pair';
  if (magic === 0x54414821) return 'indexed-tah';
  if (statSafe(cartridge.path) > 0) return 'swarm-stream';
  return 'unknown';
}

function statSafe(filePath: string) {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

function summarizeIndexedTah(payloadPath: string) {
  try {
    const retriever = new TAHRetriever(payloadPath);
    const summaries: string[] = [];

    for (let index = 0; index < 8; index++) {
      const shard = retriever.getShard(index);
      const text = shard?.data?.replace(/\s+/g, ' ').trim();
      if (text && !looksBinary(text)) summaries.push(text);
      if (summaries.join(' ').length > 240) break;
    }

    return summaries.join(' ').slice(0, 240);
  } catch {
    return '';
  }
}

function looksBinary(text: string) {
  if (!text) return true;
  const suspectCharacters = text.match(/[\u0000-\u0008\u000E-\u001F\uFFFD]/g)?.length || 0;
  return suspectCharacters / text.length > 0.08;
}
