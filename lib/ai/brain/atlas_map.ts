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
  { id: 'knowledge', label: 'General Knowledge', keywords: [] }
];

const STAGES = [
  { id: 'discover', label: 'Discovered', weight: 20 },
  { id: 'html', label: 'HTML Pages', weight: 20 },
  { id: 'json', label: 'JSON Catalog', weight: 20 },
  { id: 'headless', label: 'Headless Text', weight: 20 },
  { id: 'search', label: 'Search API', weight: 20 }
];

export function buildTahAtlasMap(host = 'https://sunsetpulse.com') {
  const cartridges = listPulseCartridges();
  const domainBuckets = bucketCartridges(cartridges);
  const nodes: AtlasNode[] = [
    {
      id: 'world',
      label: 'TAH World Map',
      type: 'world',
      group: 'world',
      progress: calculateWorldProgress(cartridges.length),
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
      progress: calculateWorldProgress(items.length),
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
      percent: calculateWorldProgress(cartridges.length),
      stages: STAGES.map(stage => ({
        ...stage,
        complete: true
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

function calculateWorldProgress(cartridgeCount: number) {
  if (cartridgeCount <= 0) return 0;
  return STAGES.reduce((sum, stage) => sum + stage.weight, 0);
}
