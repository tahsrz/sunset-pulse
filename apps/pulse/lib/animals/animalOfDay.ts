import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type ConservationProfile = {
  label: string;
  status: string;
  population: string;
  populationNote: string;
  facts: string[];
  threats: string[];
  sourceNote: string;
};

export type AnimalOfDay = {
  dateKey: string;
  taxon: string;
  rank: string;
  path: string;
  vernacular: string;
  link?: string;
  shardIndex: number;
  cartridge: string;
  group: string;
  profile: ConservationProfile;
};

type ParsedShard = {
  index: number;
  taxon: string;
  rank: string;
  path: string;
  vernacular: string;
  link?: string;
};

const CARTRIDGE_BASE = 'catalogue_of_life_v3_6';

const profiles: Array<{ match: RegExp; profile: ConservationProfile }> = [
  {
    match: /Eudyptes|Spheniscidae|penguin/i,
    profile: {
      label: 'Crested penguins',
      status: 'Many species are threatened or declining',
      population: 'Species-specific',
      populationNote:
        'There is no reliable single count for the full Eudyptes genus; conservation counts are maintained species by species.',
      facts: [
        'Crested penguins are seabirds built for cold water, fast diving, and long feeding trips.',
        'Their yellow crest feathers are display features used in courtship and recognition.',
        'Most conservation pressure comes from food-web shifts, fisheries interaction, and breeding-site disturbance.',
      ],
      threats: ['Warming oceans', 'Fishing pressure', 'Breeding habitat disturbance'],
      sourceNote: 'Taxonomy from Catalogue of Life TAH; conservation summary curated from public IUCN-style status categories.',
    },
  },
  {
    match: /Amazona|Psittacidae|parrot/i,
    profile: {
      label: 'Amazon parrots',
      status: 'Mixed status; several species are threatened',
      population: 'Species-specific',
      populationNote:
        'Amazon parrots are a genus-level spotlight here, so a single "alive today" number would be misleading.',
      facts: [
        'Amazon parrots are intelligent, social birds with strong vocal learning ability.',
        'Many species depend on mature forest cavities for nesting.',
        'Some island species have very small managed wild populations, while other mainland species remain more common.',
      ],
      threats: ['Habitat loss', 'Illegal pet trade', 'Small island populations'],
      sourceNote: 'Taxonomy from Catalogue of Life TAH; conservation summary curated for the genus/group level.',
    },
  },
  {
    match: /Asio|Strigidae|owl/i,
    profile: {
      label: 'Eared owls',
      status: 'Mostly not globally endangered, but local trends vary',
      population: 'Unknown at genus level',
      populationNote:
        'Asio is a genus-level record; population estimates vary by species and region.',
      facts: [
        'Asio owls include long-eared and short-eared owl groups with strong nocturnal hunting adaptations.',
        'They rely heavily on rodents and other small prey, so local numbers can follow prey cycles.',
        'Open grassland and wetland habitat quality matters for several species in this group.',
      ],
      threats: ['Grassland loss', 'Rodenticide exposure', 'Nest disturbance'],
      sourceNote: 'Taxonomy from Catalogue of Life TAH; conservation summary curated for the genus/group level.',
    },
  },
  {
    match: /Trochilidae|hummingbird/i,
    profile: {
      label: 'Hummingbirds',
      status: 'Mixed status; habitat specialists can be vulnerable',
      population: 'Species-specific',
      populationNote:
        'Hummingbirds are family-level here; population counts are tracked per species, not as one global total.',
      facts: [
        'Hummingbirds have extremely high-energy flight and depend on nectar plus small insects.',
        'They are important pollinators across the Americas.',
        'Range-restricted mountain and island species can be sensitive to habitat change.',
      ],
      threats: ['Habitat fragmentation', 'Climate shifts', 'Loss of native flowering plants'],
      sourceNote: 'Taxonomy from Catalogue of Life TAH; conservation summary curated for the family/group level.',
    },
  },
  {
    match: /Insecta|Arthropoda/i,
    profile: {
      label: 'Insects and arthropods',
      status: 'Often not assessed at barcode-cluster level',
      population: 'Not available',
      populationNote:
        'This TAH record is not a species-level conservation record, so no credible alive-count is available.',
      facts: [
        'Insects are core infrastructure for pollination, decomposition, soil health, and food webs.',
        'Barcode clusters help researchers distinguish lineages even when common names are unavailable.',
        'Many insects remain undescribed or under-assessed compared with mammals and birds.',
      ],
      threats: ['Habitat loss', 'Pesticide pressure', 'Light pollution'],
      sourceNote: 'Taxonomy from Catalogue of Life TAH; conservation status intentionally conservative.',
    },
  },
];

const fallbackProfile: ConservationProfile = {
  label: 'Animalia record',
  status: 'Not assessed in local dataset',
  population: 'Not available',
  populationNote:
    'The Catalogue of Life cartridge provides taxonomy, not live population counts. We only show counts when a reliable curated estimate exists.',
  facts: [
    'This spotlight comes from the local Catalogue of Life TAH cartridge.',
    'The taxonomy path shows how the animal is positioned in the tree of life.',
    'Population and endangered status require conservation datasets layered on top of taxonomy.',
  ],
  threats: ['Unknown for this taxon', 'Requires species-level conservation data'],
  sourceNote: 'Taxonomy from Catalogue of Life TAH; no local conservation estimate available.',
};

export function getAnimalOfDay(now = new Date()): AnimalOfDay | null {
  const dateKey = now.toISOString().slice(0, 10);
  const shards = readAnimalShards();
  if (!shards.length) return null;

  const curated = shards.filter((shard) => profiles.some(({ match }) => match.test(`${shard.path} ${shard.taxon}`)));
  const pool = curated.length ? curated : shards;
  const selected = pool[hashDate(dateKey) % pool.length];
  const profile = getProfileFor(selected);

  return {
    dateKey,
    taxon: selected.taxon,
    rank: selected.rank,
    path: selected.path,
    vernacular: selected.vernacular,
    link: selected.link,
    shardIndex: selected.index,
    cartridge: CARTRIDGE_BASE,
    group: profile.label,
    profile,
  };
}

function getProfileFor(shard: ParsedShard) {
  const haystack = `${shard.path} ${shard.taxon} ${shard.vernacular}`;
  return profiles.find(({ match }) => match.test(haystack))?.profile || fallbackProfile;
}

function readAnimalShards(): ParsedShard[] {
  try {
    const basePath = resolveCartridgeBasePath();
    const hat = fs.readFileSync(`${basePath}.hat`);
    const tah = fs.readFileSync(`${basePath}.tah`);
    const shardCount = hat.readUInt32LE(16);
    const bloomBits = hat.readBigUInt64LE(8);
    const indexOffset = 64 + Number((bloomBits + 7n) / 8n);
    const shards: ParsedShard[] = [];

    for (let index = 0; index < shardCount; index++) {
      const entryOffset = indexOffset + index * 80;
      const offset = Number(hat.readBigUInt64LE(entryOffset + 8));
      const length = hat.readUInt32LE(entryOffset + 16);
      const data = tah.subarray(offset, offset + length);
      const nullIndex = data.indexOf(0);
      const text = data.subarray(0, nullIndex >= 0 ? nullIndex : data.length).toString('utf8');
      const parsed = parseShard(text, index);

      if (parsed && parsed.path.startsWith('Animalia')) {
        shards.push(parsed);
      }
    }

    return shards;
  } catch (error) {
    console.warn('[ANIMAL_OF_DAY_UNAVAILABLE] Failed to read animal shards from cartridge:', error);
    return [];
  }
}

function resolveCartridgeBasePath() {
  const candidates = [
    path.join(process.cwd(), 'cartridges', CARTRIDGE_BASE),
    path.join(process.cwd(), 'apps', 'pulse', 'cartridges', CARTRIDGE_BASE),
    path.resolve(__dirname, '../../cartridges', CARTRIDGE_BASE),
  ];

  const found = candidates.find((candidate) => fs.existsSync(`${candidate}.hat`) && fs.existsSync(`${candidate}.tah`));
  return found || candidates[0];
}

function parseShard(text: string, index: number): ParsedShard | null {
  const fields = Object.fromEntries(
    text
      .split(/\r?\n/)
      .map((line) => line.split(': '))
      .filter((parts) => parts.length >= 2)
      .map(([key, ...rest]) => [key.trim(), rest.join(': ').trim()]),
  ) as Record<string, string>;

  if (!fields.Taxon || !fields.Path) return null;

  return {
    index,
    taxon: fields.Taxon,
    rank: fields.Rank || 'unranked',
    path: fields.Path,
    vernacular: fields.Vernacular || 'None',
    link: fields.Link,
  };
}

function hashDate(value: string) {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}
