import fs from 'fs';
import path from 'path';
import type { PulseCartridge } from '@/lib/ai/brain/pulse_query';

const OPAQUE_WEB_SLUG = /^web-\d+$/;
const MAX_QUERY_LENGTH = 120;

export function getCartridgeSearchQuery(cartridge: PulseCartridge) {
  if (!isOpaqueWebCartridge(cartridge)) {
    return cartridge.title;
  }

  const payload = readCartridgePayload(cartridge);
  const extractedQuery = payload ? extractPayloadQuery(payload) : '';
  return extractedQuery || cartridge.title;
}

export function getCartridgeApiUrl(host: string, cartridge: PulseCartridge, limit = 10) {
  const query = getCartridgeSearchQuery(cartridge);
  return `${host}/api/tah?q=${encodeURIComponent(query)}&limit=${limit}`;
}

function isOpaqueWebCartridge(cartridge: PulseCartridge) {
  return OPAQUE_WEB_SLUG.test(cartridge.slug) || /^web_\d+\.(hat|tah)$/i.test(cartridge.name);
}

function readCartridgePayload(cartridge: PulseCartridge) {
  const payloadPath = cartridge.type === 'hat'
    ? resolvePairedTahPath(cartridge.path)
    : cartridge.path;

  try {
    if (!fs.existsSync(payloadPath)) return '';
    return fs.readFileSync(payloadPath, 'utf8');
  } catch {
    return '';
  }
}

function resolvePairedTahPath(hatPath: string) {
  if (hatPath.endsWith('.tah.hat')) {
    return `${hatPath.slice(0, -8)}.tah.tah`;
  }

  return path.join(path.dirname(hatPath), `${path.basename(hatPath, '.hat')}.tah`);
}

function extractPayloadQuery(payload: string) {
  const text = payload
    .replace(/\0/g, ' ')
    .replace(/[^\S\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const documentationTitle = text.match(/\b([A-Z][A-Za-z0-9.+#-]*(?:\s+\d+(?:\.\d+)*)?\s+Documentation)\b/i);
  if (documentationTitle?.[1]) {
    return cleanQuery(documentationTitle[1]);
  }

  const welcomeTitle = text.match(/\bWelcome to the\s+([^.!?]{4,80})/i);
  if (welcomeTitle?.[1]) {
    return cleanQuery(welcomeTitle[1]);
  }

  const firstSentence = text.match(/^(.{20,180}?)[.!?]\s/);
  if (firstSentence?.[1]) {
    return cleanQuery(firstSentence[1]);
  }

  return cleanQuery(text.split(' ').slice(0, 12).join(' '));
}

function cleanQuery(query: string) {
  return query
    .replace(/^Menu\s+/i, '')
    .replace(/\s+Copy page$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_QUERY_LENGTH);
}
