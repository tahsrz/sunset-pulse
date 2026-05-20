import { listPulseCartridges, type PulseCartridge } from '@/lib/ai/brain/pulse_query';
import { getCartridgeMetadata } from '@/lib/ai/brain/cartridge_metadata';

const MAX_PROBE_LIMIT = 25;
const DEFAULT_PROBE_LIMIT = 12;

export type AtlasProbeItem = {
  slug: string;
  title: string;
  displayTitle: string;
  source: string;
  type: PulseCartridge['type'];
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
  const metadata = getCartridgeMetadata(cartridge);

  return {
    slug: metadata.slug,
    title: metadata.title,
    displayTitle: metadata.displayTitle,
    source: metadata.source,
    type: metadata.type,
    domain: metadata.domain,
    searchQuery: metadata.searchQuery,
    byteSize: metadata.byteSize,
    payloadByteSize: metadata.payloadByteSize,
    shardCount: metadata.shardCount,
    bloomBits: metadata.bloomBits,
    hashCount: metadata.hashCount,
    format: metadata.format,
    summary: metadata.summary
  };
}
