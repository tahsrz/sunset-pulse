import { PulseCartridge, listPulseCartridges } from '@/lib/ai/brain/pulse_query';
import { CARTRIDGE_DOMAINS } from '@/lib/ai/brain/cartridge_domains';
import { getCartridgeMetadata } from '@/lib/ai/brain/cartridge_metadata';

type AtlasNode = {
  id: string;
  label: string;
  type: 'world' | 'continent' | 'cartridge';
  group: string;
  slug?: string;
  source?: string;
  displayTitle?: string;
  summary?: string;
  format?: string;
  byteSize?: number;
  shardCount?: number;
  progress: number;
  val: number;
  url?: string;
  headlessUrl?: string;
  apiUrl?: string;
  searchQuery?: string;
};

type AtlasLink = {
  source: string;
  target: string;
  value: number;
};

const STAGES = [
  { id: 'seed', label: 'Seed Map', threshold: 1 },
  { id: 'regions', label: 'Regions', threshold: 25 },
  { id: 'library', label: 'Library Scale', threshold: 100 },
  { id: 'bridges', label: 'Cross Links', threshold: 250 },
  { id: 'swarm', label: 'Swarm Scale', threshold: 1000 }
];

const DEFAULT_ATLAS_TARGET_CARTRIDGES = 1000;

export function buildTahAtlasMap(host = 'https://sunsetpulse.app') {
  const cartridges = listPulseCartridges();
  const metadata = cartridges.map(cartridge => getCartridgeMetadata(cartridge, host));
  const domainBuckets = bucketCartridges(cartridges);
  const progress = calculateAtlasProgress(metadata.length);
  const nodes: AtlasNode[] = [
    {
      id: 'world',
      label: 'Atlas Pulse',
      type: 'world',
      group: 'world',
      progress: progress.percent,
      val: 32,
      url: `${host}/tah`
    }
  ];
  const links: AtlasLink[] = [];

  for (const domain of CARTRIDGE_DOMAINS) {
    const items = domainBuckets[domain.id] || [];
    if (items.length === 0) continue;

    nodes.push({
      id: domain.id,
      label: domain.label,
      type: 'continent',
      group: domain.id,
      progress: calculateAtlasProgress(items.length, Math.ceil(progress.targetCartridges / CARTRIDGE_DOMAINS.length)).percent,
      val: Math.min(24, 10 + items.length / 4),
      url: `${host}/tah`
    });
    links.push({ source: 'world', target: domain.id, value: 4 });

    for (const cartridge of items) {
      const item = metadata.find(candidate => candidate.slug === cartridge.slug);
      if (!item) continue;

      nodes.push({
        id: `cartridge:${item.slug}`,
        label: item.displayTitle,
        type: 'cartridge',
        group: domain.id,
        slug: item.slug,
        source: item.source,
        displayTitle: item.displayTitle,
        summary: item.summary,
        format: item.format,
        byteSize: item.byteSize,
        shardCount: item.shardCount,
        progress: 100,
        val: 6,
        url: item.routes.html,
        headlessUrl: item.routes.headless,
        apiUrl: item.routes.api,
        searchQuery: item.searchQuery
      });
      links.push({ source: domain.id, target: `cartridge:${item.slug}`, value: 1 });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    progress: {
      totalCartridges: cartridges.length,
      targetCartridges: progress.targetCartridges,
      percent: progress.percent,
      stages: STAGES.map(stage => ({
        ...stage,
        complete: cartridges.length >= stage.threshold
      }))
    },
    nodes,
    links
  };
}

function bucketCartridges(cartridges: PulseCartridge[]) {
  const buckets: Record<string, PulseCartridge[]> = Object.fromEntries(CARTRIDGE_DOMAINS.map(domain => [domain.id, []]));

  for (const cartridge of cartridges) {
    const domain = getCartridgeMetadata(cartridge).domain;
    buckets[domain.id].push(cartridge);
  }

  return buckets;
}

function calculateAtlasProgress(cartridgeCount: number, targetCartridges = atlasTargetCartridges()) {
  if (cartridgeCount <= 0) {
    return {
      targetCartridges,
      percent: 0
    };
  }
  const rawPercent = Math.round((cartridgeCount / targetCartridges) * 100);
  return {
    targetCartridges,
    percent: Math.min(99, Math.max(1, rawPercent))
  };
}

function atlasTargetCartridges() {
  const configuredTarget = Number(process.env.TAH_ATLAS_TARGET_CARTRIDGES);
  if (Number.isFinite(configuredTarget) && configuredTarget > 0) {
    return configuredTarget;
  }

  return DEFAULT_ATLAS_TARGET_CARTRIDGES;
}
