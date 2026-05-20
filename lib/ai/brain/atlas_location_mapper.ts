import type { CartridgeMetadata } from '@/lib/ai/brain/cartridge_metadata';
import { getAtlasPulseSummary } from '@/lib/tah/texasPlaceHistory';

export type AtlasCoordinateSource = 'atlas-pulse-place' | 'texas-location-match' | 'domain-hash';

export type AtlasLocationResolution = {
  lat: number;
  lng: number;
  coordinateSource: AtlasCoordinateSource;
  placeName: string | null;
  region: string | null;
  confidence: number;
  reason: string;
};

type LocationAnchor = {
  name: string;
  region: string;
  lat: number;
  lng: number;
  aliases: string[];
  source: Exclude<AtlasCoordinateSource, 'domain-hash'>;
};

const TEXAS_LOCATION_ANCHORS: LocationAnchor[] = [
  anchor('Dallas, Texas', 'Dallas County', 32.7767, -96.797, ['dallas texas', 'dallas tx']),
  anchor('Bowie, Texas', 'Montague County', 33.559, -97.8486, ['bowie texas', 'bowie tx']),
  anchor('Decatur, Texas', 'Wise County', 33.2343, -97.5861, ['decatur texas', 'decatur tx']),
  anchor('Denton, Texas', 'Denton County', 33.2148, -97.1331, ['denton texas', 'denton tx']),
  anchor('Fort Worth, Texas', 'Tarrant County', 32.7555, -97.3308, ['fort worth texas', 'fort worth tx']),
  anchor('Austin, Texas', 'Travis County', 30.2672, -97.7431, ['austin texas', 'austin tx']),
  anchor('Fredericksburg, Texas', 'Gillespie County', 30.2752, -98.8719, ['fredericksburg texas', 'fredericksburg tx']),
  anchor('Wimberley, Texas', 'Hays County', 29.9974, -98.0986, ['wimberley texas', 'wimberley tx']),
  anchor('New Braunfels, Texas', 'Comal County', 29.703, -98.1245, ['new braunfels texas', 'new braunfels tx']),
  anchor('Georgetown, Texas', 'Williamson County', 30.6333, -97.6779, ['georgetown texas', 'georgetown tx']),
  anchor('Galveston, Texas', 'Galveston County', 29.3013, -94.7977, ['galveston texas', 'galveston tx']),
  anchor('Houston, Texas', 'Harris County', 29.7604, -95.3698, ['houston texas', 'houston tx']),
  anchor('Port Aransas, Texas', 'Nueces County', 27.8339, -97.0611, ['port aransas texas', 'port aransas tx']),
  anchor('Corpus Christi, Texas', 'Nueces County', 27.8006, -97.3964, ['corpus christi texas', 'corpus christi tx']),
  anchor('Rockport, Texas', 'Aransas County', 28.0206, -97.0544, ['rockport texas', 'rockport tx']),
  anchor('Nacogdoches, Texas', 'Nacogdoches County', 31.6035, -94.6555, ['nacogdoches texas', 'nacogdoches tx']),
  anchor('Tyler, Texas', 'Smith County', 32.3513, -95.3011, ['tyler texas', 'tyler tx']),
  anchor('Marshall, Texas', 'Harrison County', 32.5449, -94.3674, ['marshall texas', 'marshall tx']),
  anchor('Jefferson, Texas', 'Marion County', 32.7574, -94.3452, ['jefferson texas', 'jefferson tx']),
  anchor('Longview, Texas', 'Gregg County', 32.5007, -94.7405, ['longview texas', 'longview tx']),
  anchor('Amarillo, Texas', 'Potter County', 35.222, -101.8313, ['amarillo texas', 'amarillo tx']),
  anchor('Lubbock, Texas', 'Lubbock County', 33.5779, -101.8552, ['lubbock texas', 'lubbock tx']),
  anchor('Marfa, Texas', 'Presidio County', 30.3095, -104.0206, ['marfa texas', 'marfa tx']),
  anchor('El Paso, Texas', 'El Paso County', 31.7619, -106.485, ['el paso texas', 'el paso tx']),
  anchor('San Antonio, Texas', 'Bexar County', 29.4252, -98.4946, ['san antonio texas', 'san antonio tx']),
  anchor('Laredo, Texas', 'Webb County', 27.5036, -99.5076, ['laredo texas', 'laredo tx'])
];

export function resolveAtlasLocation(
  item: CartridgeMetadata,
  fallback: { lat: number; lng: number }
): AtlasLocationResolution {
  const anchors = atlasPulseAnchors().concat(TEXAS_LOCATION_ANCHORS);
  const haystack = normalize([
    item.slug,
    item.title,
    item.displayTitle,
    item.source,
    item.searchQuery,
    item.summary
  ].join(' '));

  const best = anchors
    .map(candidate => ({
      candidate,
      score: scoreAnchor(candidate, haystack)
    }))
    .filter(match => match.score > 0)
    .sort((a, b) => b.score - a.score)[0];

  if (!best) {
    return {
      ...fallback,
      coordinateSource: 'domain-hash',
      placeName: null,
      region: null,
      confidence: 0,
      reason: 'No physical Texas place match found in cartridge title, query, or summary.'
    };
  }

  return {
    lat: best.candidate.lat,
    lng: best.candidate.lng,
    coordinateSource: best.candidate.source,
    placeName: best.candidate.name,
    region: best.candidate.region,
    confidence: Math.min(100, best.score),
    reason: `Matched ${best.candidate.name} from cartridge title, query, or summary.`
  };
}

export function isWebCaptureCartridge(item: Pick<CartridgeMetadata, 'slug' | 'source' | 'domain'>) {
  return item.domain.id === 'web-captures'
    || /^web[-_]/i.test(item.slug)
    || /^web[-_]/i.test(item.source)
    || /^wiki[-_]/i.test(item.slug)
    || /^wiki[-_]/i.test(item.source);
}

function atlasPulseAnchors(): LocationAnchor[] {
  return getAtlasPulseSummary().places.map(place => ({
    name: place.name,
    region: place.region,
    lat: place.atlasPulse.coordinates.lat,
    lng: place.atlasPulse.coordinates.lng,
    aliases: [
      place.name,
      place.name.replace(', Texas', ' Texas'),
      place.name.replace(', Texas', ' TX'),
      place.atlasPulse.physicalAnchor,
      place.region
    ],
    source: 'atlas-pulse-place'
  }));
}

function anchor(
  name: string,
  region: string,
  lat: number,
  lng: number,
  aliases: string[]
): LocationAnchor {
  return {
    name,
    region,
    lat,
    lng,
    aliases: [name, name.replace(', Texas', ''), name.replace(', Texas', ' Texas'), name.replace(', Texas', ' TX'), region, ...aliases],
    source: 'texas-location-match'
  };
}

function scoreAnchor(anchorCandidate: LocationAnchor, haystack: string) {
  return anchorCandidate.aliases.reduce((score, alias) => {
    const normalizedAlias = normalize(alias);
    if (!normalizedAlias || !containsPhrase(haystack, normalizedAlias)) return score;

    const placeNameScore = normalizedAlias.includes('texas') || normalizedAlias.endsWith(' tx') ? 92 : 74;
    const sourceBoost = anchorCandidate.source === 'atlas-pulse-place' ? 8 : 0;
    return Math.max(score, placeNameScore + sourceBoost);
  }, 0);
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsPhrase(haystack: string, needle: string) {
  return ` ${haystack} `.includes(` ${needle} `);
}
