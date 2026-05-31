import { CARTRIDGE_DOMAINS } from '@/lib/ai/brain/cartridge_domains';
import { getCartridgeMetadata, type CartridgeMetadata } from '@/lib/ai/brain/cartridge_metadata';
import { readAtlasManifest } from '@/lib/ai/brain/atlas_manifest';
import { listPulseCartridges } from '@/lib/ai/brain/pulse_query';

type GlobeStatus = 'mapped' | 'discovered' | 'empty';

export type AtlasGlobeNode = {
  id: string;
  slug: string;
  title: string;
  source: string;
  domain: {
    id: string;
    label: string;
    color: string;
  };
  status: GlobeStatus;
  coverage: number;
  confidence: number;
  snippetCount: number;
  byteSize: number;
  shardCount: number;
  lat: number;
  lng: number;
  radius: number;
  coordinateSource: 'domain-hash';
  lastMappedAt: string | null;
  routes: CartridgeMetadata['routes'];
  summary: string;
  searchQuery: string;
};

const DEFAULT_ATLAS_TARGET_NODES = 1000;

export function buildAtlasGlobe(host = 'https://sunsetpulse.app') {
  const generatedAt = new Date().toISOString();
  const cartridges = listPulseCartridges();
  const metadata = cartridges.map(cartridge => getCartridgeMetadata(cartridge, host));
  const manifest = readAtlasManifest();
  const manifestItems = new Map<string, any>((manifest?.items || []).map((item: any) => [item.slug, item]));
  const targetNodes = atlasTargetNodes();
  const nodes = metadata.map(item => toGlobeNode(item, manifestItems.get(item.slug), generatedAt));
  const mappedNodes = nodes.filter(node => node.status === 'mapped').length;
  const discoveredNodes = nodes.length;
  const plottedNodes = nodes.filter(node => Number.isFinite(node.lat) && Number.isFinite(node.lng)).length;
  const indexedSnippets = nodes.reduce((sum, node) => sum + node.snippetCount, 0);
  const byteSize = nodes.reduce((sum, node) => sum + node.byteSize, 0);
  const averageCoverage = nodes.length === 0
    ? 0
    : Math.round(nodes.reduce((sum, node) => sum + node.coverage, 0) / nodes.length);
  const worldCompletion = targetNodes === 0 ? 0 : Math.min(99, Math.round((discoveredNodes / targetNodes) * 100));
  const catalogCoverage = discoveredNodes === 0 ? 0 : Math.round((mappedNodes / discoveredNodes) * 100);

  return {
    name: 'Atlas Pulse TAH Globe',
    version: 1,
    generatedAt,
    source: manifest ? 'published-swarm-manifest' : 'live-local-catalog',
    progress: {
      targetNodes,
      knownNodes: discoveredNodes,
      plottedNodes,
      mappedNodes,
      unmappedNodes: Math.max(0, discoveredNodes - mappedNodes),
      worldCompletion,
      catalogCoverage,
      averageCoverage,
      indexedSnippets,
      byteSize,
      lastSwarmRunAt: manifest?.generatedAt || null
    },
    domains: CARTRIDGE_DOMAINS.map(domain => {
      const domainNodes = nodes.filter(node => node.domain.id === domain.id);
      const mapped = domainNodes.filter(node => node.status === 'mapped').length;
      return {
        id: domain.id,
        label: domain.label,
        color: domain.color,
        knownNodes: domainNodes.length,
        mappedNodes: mapped,
        coverage: domainNodes.length === 0 ? 0 : Math.round((mapped / domainNodes.length) * 100)
      };
    }).filter(domain => domain.knownNodes > 0),
    nodes
  };
}

function toGlobeNode(item: CartridgeMetadata, manifestItem: any, fallbackTimestamp: string): AtlasGlobeNode {
  const coordinates = coordinatesFor(item.slug, item.domain.id);
  const snippetCount = Math.max(item.shardCount || 0, manifestItem?.shardCount || 0);
  const coverage = coverageFor(item, manifestItem);
  const confidence = confidenceFor(item, manifestItem);
  const status: GlobeStatus = manifestItem ? 'mapped' : item.byteSize > 0 ? 'discovered' : 'empty';

  return {
    id: `globe:${item.slug}`,
    slug: item.slug,
    title: item.displayTitle,
    source: item.source,
    domain: item.domain,
    status,
    coverage,
    confidence,
    snippetCount,
    byteSize: item.payloadByteSize || item.byteSize,
    shardCount: item.shardCount,
    lat: coordinates.lat,
    lng: coordinates.lng,
    radius: Math.max(2.5, Math.min(9, 2 + Math.log10(Math.max(10, item.payloadByteSize || item.byteSize)))),
    coordinateSource: 'domain-hash',
    lastMappedAt: manifestItem ? manifestItem.mappedAt || manifestItem.generatedAt || fallbackTimestamp : null,
    routes: item.routes,
    summary: item.summary,
    searchQuery: item.searchQuery
  };
}

function coverageFor(item: CartridgeMetadata, manifestItem: any) {
  if (!item.byteSize) return 0;
  if (manifestItem) return 100;
  if (item.format === 'indexed-tah') return Math.min(95, Math.max(25, item.shardCount));
  if (item.format === 'memoria-pair') return 70;
  if (item.format === 'swarm-stream') return 55;
  return 20;
}

function confidenceFor(item: CartridgeMetadata, manifestItem: any) {
  if (manifestItem) return 95;
  if (item.format === 'indexed-tah' && item.hashCount > 0) return 82;
  if (item.summary && item.summary !== item.searchQuery) return 72;
  return 48;
}

function coordinatesFor(slug: string, domainId: string) {
  const domainIndex = Math.max(0, CARTRIDGE_DOMAINS.findIndex(domain => domain.id === domainId));
  const bandCount = CARTRIDGE_DOMAINS.length || 1;
  const bandCenter = 62 - (domainIndex + 0.5) * (124 / bandCount);
  const hashA = hashString(`${domainId}:${slug}:lat`);
  const hashB = hashString(`${slug}:${domainId}:lng`);
  const lat = clamp(bandCenter + ((hashA % 2800) / 100 - 14), -72, 72);
  const lng = ((hashB % 36000) / 100) - 180;

  return {
    lat: Math.round(lat * 100) / 100,
    lng: Math.round(lng * 100) / 100
  };
}

function hashString(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function atlasTargetNodes() {
  const configuredTarget = Number(process.env.TAH_ATLAS_TARGET_CARTRIDGES || process.env.TAH_ATLAS_TARGET_NODES);
  if (Number.isFinite(configuredTarget) && configuredTarget > 0) {
    return configuredTarget;
  }

  return DEFAULT_ATLAS_TARGET_NODES;
}
