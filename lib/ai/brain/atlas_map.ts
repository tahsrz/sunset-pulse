import { PulseCartridge, listPulseCartridges } from '@/lib/ai/brain/pulse_query';

type AtlasNode = {
  id: string;
  label: string;
  type: 'world' | 'continent' | 'cartridge';
  group: string;
  slug?: string;
  source?: string;
  progress: number;
  val: number;
  url?: string;
  headlessUrl?: string;
  apiUrl?: string;
};

type AtlasLink = {
  source: string;
  target: string;
  value: number;
};

const DOMAIN_RULES: Array<{ id: string; label: string; keywords: string[] }> = [
  { id: 'pulse', label: 'Sunset Pulse', keywords: ['sunset', 'pulse', 'jamie', 'user', 'memory', 'memories', 'abidan', 'vault'] },
  { id: 'real-estate', label: 'Real Estate', keywords: ['real', 'estate', 'tarrant', 'texas', 'deeds', 'listing', 'mls', 'neighborhood'] },
  { id: 'computer-science', label: 'Computer Science', keywords: ['algorithm', 'architecture', 'compiler', 'operating', 'python', 'unix', 'sicp', 'schemer', 'category'] },
  { id: 'ai', label: 'AI & Learning', keywords: ['ai', 'artificial', 'deep', 'learning', 'neural', 'polymorphic'] },
  { id: 'medicine', label: 'Medical', keywords: ['medical', 'encyclopedia'] },
  { id: 'local-world', label: 'Local World', keywords: ['dallas', 'wiki', 'local'] },
  { id: 'web-captures', label: 'Web Captures', keywords: ['web', 'crawl', 'site', 'url', 'internet', 'html', 'docs'] },
  { id: 'knowledge', label: 'General Knowledge', keywords: [] }
];

const STAGES = [
  { id: 'seed', label: 'Seed Map', threshold: 1 },
  { id: 'regions', label: 'Regions', threshold: 25 },
  { id: 'library', label: 'Library Scale', threshold: 100 },
  { id: 'bridges', label: 'Cross Links', threshold: 250 },
  { id: 'swarm', label: 'Swarm Scale', threshold: 1000 }
];

const DEFAULT_ATLAS_TARGET_CARTRIDGES = 1000;

export function buildTahAtlasMap(host = 'https://sunsetpulse.com') {
  const cartridges = listPulseCartridges();
  const domainBuckets = bucketCartridges(cartridges);
  const progress = calculateAtlasProgress(cartridges.length);
  const nodes: AtlasNode[] = [
    {
      id: 'world',
      label: 'TAH World Map',
      type: 'world',
      group: 'world',
      progress: progress.percent,
      val: 32,
      url: `${host}/tah`
    }
  ];
  const links: AtlasLink[] = [];

  for (const domain of DOMAIN_RULES) {
    const items = domainBuckets[domain.id] || [];
    if (items.length === 0) continue;

    nodes.push({
      id: domain.id,
      label: domain.label,
      type: 'continent',
      group: domain.id,
      progress: calculateAtlasProgress(items.length, Math.ceil(progress.targetCartridges / DOMAIN_RULES.length)).percent,
      val: Math.min(24, 10 + items.length / 4),
      url: `${host}/tah`
    });
    links.push({ source: 'world', target: domain.id, value: 4 });

    for (const cartridge of items) {
      nodes.push({
        id: `cartridge:${cartridge.slug}`,
        label: cartridge.title,
        type: 'cartridge',
        group: domain.id,
        slug: cartridge.slug,
        source: cartridge.name,
        progress: 100,
        val: 6,
        url: `${host}/tah/${cartridge.slug}`,
        headlessUrl: `${host}/tah/${cartridge.slug}/headless`,
        apiUrl: `${host}/api/tah?q=${encodeURIComponent(cartridge.title)}&limit=10`
      });
      links.push({ source: domain.id, target: `cartridge:${cartridge.slug}`, value: 1 });
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
  const buckets: Record<string, PulseCartridge[]> = Object.fromEntries(DOMAIN_RULES.map(domain => [domain.id, []]));

  for (const cartridge of cartridges) {
    const haystack = `${cartridge.slug} ${cartridge.title} ${cartridge.name}`.toLowerCase();
    const domain = DOMAIN_RULES.find(rule => rule.keywords.some(keyword => haystack.includes(keyword))) || DOMAIN_RULES[DOMAIN_RULES.length - 1];
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
