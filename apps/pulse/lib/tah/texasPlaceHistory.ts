export type TexasPlaceHistoryMilestone = {
  label: string;
  title: string;
  body: string;
};

export type TexasPlaceHistorySource = {
  label: string;
  url: string;
};

export type AtlasPulseStageId = 'located' | 'sourced' | 'seeded' | 'forged' | 'bound' | 'live';

export type AtlasPulseStage = {
  id: AtlasPulseStageId;
  label: string;
};

export type AtlasPulseCartridgeBinding = {
  cartridgeName: string;
  cartridgeSlug: string;
  relationship: string;
  strength: number;
  status: 'planned' | 'partial' | 'bound';
};

export type AtlasPulsePlaceState = {
  physicalAnchor: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  bindingStrength: number;
  activeStage: AtlasPulseStageId;
  completedStages: AtlasPulseStageId[];
  boundCartridges: AtlasPulseCartridgeBinding[];
};

export type TexasPlaceHistoryTah = {
  cartridgeName: string;
  querySeed: string;
  keywords: string[];
  status: 'seeded' | 'planned';
};

export type TexasPlaceHistoryEntry = {
  slug: string;
  name: string;
  region: string;
  headline: string;
  summary: string;
  detail: string;
  milestones: TexasPlaceHistoryMilestone[];
  sources: TexasPlaceHistorySource[];
  tah: TexasPlaceHistoryTah;
  atlasPulse: AtlasPulsePlaceState;
};

export type TexasPlaceHistoryRollout = {
  region: string;
  status: 'started' | 'planned';
  places: string[];
};

export type TexasPlaceHistoryTahInput = {
  keywords: string[];
  data: string;
  type?: number;
  meta?: number;
};

export const TEXAS_PLACE_HISTORY_CARTRIDGE = 'texas_place_history.tah';

export const ATLAS_PULSE_STAGES: AtlasPulseStage[] = [
  { id: 'located', label: 'Located' },
  { id: 'sourced', label: 'Sourced' },
  { id: 'seeded', label: 'Seeded' },
  { id: 'forged', label: 'Forged' },
  { id: 'bound', label: 'Bound' },
  { id: 'live', label: 'Live' }
];

export const TEXAS_PLACE_HISTORY: TexasPlaceHistoryEntry[] = [
  {
    slug: 'sunset',
    name: 'Sunset, Texas',
    region: 'Montague County',
    headline: 'A Small North Texas Town With A Long Memory',
    summary:
      'Sunset sits in southern Montague County near State Highway 101 and Farm Road 1749. Its story runs through frontier settlement, a post office name change, railroad growth, and the farm economy that shaped much of North Texas.',
    detail:
      'A surveying error once placed Sunset in Wise County, but a 1900 lawsuit awarded the land, including the townsite, to Montague County. That mix of local identity, boundary history, and working-land heritage is part of the place Sunset Pulse calls home.',
    milestones: [
      {
        label: '1870s',
        title: 'A Store Becomes A Townsite',
        body:
          'Early settlers arrived from Denton County, and Sam Smith opened a grocery store that became one of the anchors of the growing community.'
      },
      {
        label: '1880',
        title: 'The Name Sunset Sticks',
        body:
          'Smith applied for a post office under the name Smithville. Because that name was already taken, postal authorities suggested Sunset.'
      },
      {
        label: '1882-1884',
        title: 'Railroad Momentum',
        body:
          'The Fort Worth and Denver Railway came through the community, drawing nearby residents toward the tracks. Sunset voted to incorporate on July 26, 1884.'
      },
      {
        label: '1900s',
        title: 'A Farm Market Center',
        body:
          'By 1900, Sunset had grown past 600 residents and supported cotton gins, banks, a school, churches, a gristmill, a canning factory, and the Sunset Signal newspaper.'
      }
    ],
    sources: [
      {
        label: 'Handbook of Texas',
        url: 'https://www.tshaonline.org/handbook/entries/sunset-tx'
      },
      {
        label: 'Portal to Texas History',
        url: 'https://texashistory.unt.edu/explore/locations/p02017/'
      }
    ],
    tah: {
      cartridgeName: TEXAS_PLACE_HISTORY_CARTRIDGE,
      querySeed: 'Sunset Texas history Montague County railroad post office',
      keywords: [
        'Sunset Texas',
        'Sunset TX',
        'Sunset, Texas',
        'history of Sunset Texas',
        'Atlas Pulse',
        'Texas Place History',
        'Montague County',
        'Fort Worth and Denver Railway',
        'Sam Smith Sunset',
        'Sunset Signal'
      ],
      status: 'seeded'
    },
    atlasPulse: {
      physicalAnchor: 'Sunset townsite, southern Montague County',
      coordinates: {
        lat: 33.4504,
        lng: -97.7709
      },
      bindingStrength: 72,
      activeStage: 'bound',
      completedStages: ['located', 'sourced', 'seeded', 'forged', 'bound'],
      boundCartridges: [
        {
          cartridgeName: TEXAS_PLACE_HISTORY_CARTRIDGE,
          cartridgeSlug: 'texas-place-history',
          relationship: 'Primary local history shard',
          strength: 92,
          status: 'bound'
        },
        {
          cartridgeName: 'neighborhood_intel.tah',
          cartridgeSlug: 'neighborhood-intel',
          relationship: 'Regional neighborhood context',
          strength: 38,
          status: 'partial'
        },
        {
          cartridgeName: 'market_velocity.tah',
          cartridgeSlug: 'market-velocity',
          relationship: 'Nearby North Texas market behavior',
          strength: 31,
          status: 'partial'
        }
      ]
    }
  }
];

export const TEXAS_PLACE_HISTORY_ROLLOUT: TexasPlaceHistoryRollout[] = [
  {
    region: 'North Texas',
    status: 'started',
    places: ['Sunset', 'Bowie', 'Decatur', 'Denton', 'Fort Worth']
  },
  {
    region: 'Hill Country and Central Texas',
    status: 'planned',
    places: ['Austin', 'Fredericksburg', 'Wimberley', 'New Braunfels', 'Georgetown']
  },
  {
    region: 'Gulf Coast',
    status: 'planned',
    places: ['Galveston', 'Houston', 'Port Aransas', 'Corpus Christi', 'Rockport']
  },
  {
    region: 'Piney Woods and East Texas',
    status: 'planned',
    places: ['Nacogdoches', 'Tyler', 'Marshall', 'Jefferson', 'Longview']
  },
  {
    region: 'Panhandle, West Texas, and South Texas',
    status: 'planned',
    places: ['Amarillo', 'Lubbock', 'Marfa', 'El Paso', 'San Antonio', 'Laredo']
  }
];

export function listTexasPlaceHistory() {
  return TEXAS_PLACE_HISTORY;
}

export function getTexasPlaceHistory(slug = 'sunset') {
  return TEXAS_PLACE_HISTORY.find(entry => entry.slug === slug) || null;
}

export function listAtlasPulsePlaces() {
  return TEXAS_PLACE_HISTORY.map(toAtlasPulsePlace);
}

export function getAtlasPulsePlace(slug = 'sunset') {
  const entry = getTexasPlaceHistory(slug);
  return entry ? toAtlasPulsePlace(entry) : null;
}

export function getAtlasPulseSummary() {
  const places = listAtlasPulsePlaces();
  const bindingPercent = places.length
    ? Math.round(places.reduce((sum, place) => sum + place.atlasPulse.bindingStrength, 0) / places.length)
    : 0;

  return {
    name: 'Atlas Pulse',
    scope: 'Texas',
    progress: {
      percent: bindingPercent,
      boundPlaces: places.filter(place => place.atlasPulse.completedStages.includes('bound')).length,
      livePlaces: places.filter(place => place.atlasPulse.completedStages.includes('live')).length,
      totalSeededPlaces: places.length,
      plannedRegions: TEXAS_PLACE_HISTORY_ROLLOUT.length
    },
    stages: ATLAS_PULSE_STAGES,
    places,
    rollout: TEXAS_PLACE_HISTORY_ROLLOUT
  };
}

export function buildTexasPlaceHistoryTahInputs(): TexasPlaceHistoryTahInput[] {
  return TEXAS_PLACE_HISTORY.map(entry => ({
    keywords: entry.tah.keywords,
    data: formatTexasPlaceHistoryForTah(entry),
    type: 1,
    meta: 210
  }));
}

export function formatTexasPlaceHistoryForTah(entry: TexasPlaceHistoryEntry) {
  const milestones = entry.milestones
    .map(item => `${item.label}: ${item.title} - ${item.body}`)
    .join(' | ');
  const sources = entry.sources.map(source => `${source.label}: ${source.url}`).join(' | ');
  const bindings = entry.atlasPulse.boundCartridges
    .map(binding => `${binding.cartridgeName} (${binding.relationship}, ${binding.strength}%)`)
    .join(' | ');

  return [
    'DOMAIN: Atlas Pulse Texas Place History',
    `PLACE: ${entry.name}`,
    `SLUG: ${entry.slug}`,
    `REGION: ${entry.region}`,
    `PHYSICAL_ANCHOR: ${entry.atlasPulse.physicalAnchor}`,
    `COORDINATES: ${entry.atlasPulse.coordinates.lat}, ${entry.atlasPulse.coordinates.lng}`,
    `ATLAS_PULSE_BINDING: ${entry.atlasPulse.bindingStrength}`,
    `ATLAS_PULSE_STAGE: ${entry.atlasPulse.activeStage}`,
    `BOUND_CARTRIDGES: ${bindings}`,
    `HEADLINE: ${entry.headline}`,
    `SUMMARY: ${entry.summary}`,
    `DETAIL: ${entry.detail}`,
    `MILESTONES: ${milestones}`,
    `QUERY_SEED: ${entry.tah.querySeed}`,
    `SOURCES: ${sources}`
  ].join(' | ');
}

function toAtlasPulsePlace(entry: TexasPlaceHistoryEntry) {
  return {
    slug: entry.slug,
    name: entry.name,
    region: entry.region,
    headline: entry.headline,
    summary: entry.summary,
    tah: entry.tah,
    sources: entry.sources,
    atlasPulse: entry.atlasPulse
  };
}
