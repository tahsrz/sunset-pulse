export type LocationGuessListing = {
  id: string;
  title: string;
  city: string;
  county: string;
  image: string;
  actualCoordinates: [number, number]; // [longitude, latitude]
  beds: number;
  baths: number;
  squareFeet: number;
  acreage?: number;
  yearBuilt: number;
  propertyType: string;
  signal: string;
  source?: string;
};

export type LocationGuessResult = {
  guessCoordinates: [number, number];
  actualCoordinates: [number, number];
  distanceMiles: number;
  roundScore: number;
  percentOff: number;
  label: 'bullseye' | 'close' | 'neighborhood' | 'county' | 'lost';
};

// Simple Fallback Deck
export const LOCATION_GUESS_DECK: LocationGuessListing[] = [
  {
    id: 'sunset-hq',
    title: 'Sunset Pulse HQ',
    city: 'Sunset',
    county: 'Montague',
    image: '/images/properties/land1.jpg',
    actualCoordinates: [-97.7667, 33.4334], // Example long/lat for Sunset, TX
    beds: 3,
    baths: 2,
    squareFeet: 2100,
    acreage: 2,
    yearBuilt: 2020,
    propertyType: 'Single Family',
    signal: 'Prime location near the heart of Sunset.',
    source: 'Curated'
  },
  {
    id: 'forestburg-barndo',
    title: 'Forestburg Barndominium',
    city: 'Forestburg',
    county: 'Montague',
    image: '/images/properties/barndo1.jpg',
    actualCoordinates: [-97.5809, 33.5351],
    beds: 3,
    baths: 2,
    squareFeet: 2100,
    acreage: 6.2,
    yearBuilt: 2020,
    propertyType: 'Barndominium',
    signal: 'Rural edge with acreage and shop-style utility.',
    source: 'Curated'
  },
  {
    id: 'bowie-starter',
    title: 'Bowie Starter Ranch Home',
    city: 'Bowie',
    county: 'Montague',
    image: '/images/properties/rhome1.jpg',
    actualCoordinates: [-97.8486, 33.5590],
    beds: 3,
    baths: 2,
    squareFeet: 1760,
    acreage: 0.4,
    yearBuilt: 1998,
    propertyType: 'Single Family',
    signal: 'Small-city access near the west side of the county.',
    source: 'Curated'
  },
  {
    id: 'montague-ranch',
    title: 'Montague Working Ranch',
    city: 'Montague',
    county: 'Montague',
    image: '/images/properties/ranch1.jpg',
    actualCoordinates: [-97.7203, 33.6648],
    beds: 4,
    baths: 3,
    squareFeet: 3180,
    acreage: 28,
    yearBuilt: 2012,
    propertyType: 'Ranch',
    signal: 'County-seat proximity with meaningful acreage.',
    source: 'Curated'
  },
  {
    id: 'ridge-road-classic',
    title: 'Ridge Road Brick Traditional',
    city: 'Sunset',
    county: 'Montague',
    image: '/images/properties/244ridge1.jpg',
    actualCoordinates: [-97.7678, 33.4391],
    beds: 4,
    baths: 3,
    squareFeet: 2440,
    acreage: 1.8,
    yearBuilt: 2004,
    propertyType: 'Single Family',
    signal: 'Small-town residential pocket near the Sunset corridor.',
    source: 'Curated'
  }
];

export function evaluateLocationGuess(actual: [number, number], guess: [number, number]): LocationGuessResult {
  const distanceMiles = haversineDistanceMiles(actual, guess);
  
  // Let's say max distance is 100 miles for scoring purposes.
  // 0 miles = 1000 points. 100 miles = 0 points.
  const MAX_DISTANCE = 100;
  let percentOff = distanceMiles / MAX_DISTANCE;
  if (percentOff > 1) percentOff = 1;
  
  const roundScore = Math.max(0, Math.round(1000 * (1 - percentOff)));
  
  return {
    guessCoordinates: guess,
    actualCoordinates: actual,
    distanceMiles: Number(distanceMiles.toFixed(2)),
    roundScore,
    percentOff,
    label: getLocationResultLabel(distanceMiles)
  };
}

function getLocationResultLabel(distanceMiles: number): LocationGuessResult['label'] {
  if (distanceMiles <= 1) return 'bullseye';
  if (distanceMiles <= 5) return 'close';
  if (distanceMiles <= 15) return 'neighborhood';
  if (distanceMiles <= 30) return 'county';
  return 'lost';
}

function haversineDistanceMiles(coord1: [number, number], coord2: [number, number]): number {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  
  const toRad = (value: number) => (value * Math.PI) / 180;
  
  const R = 3958.8; // Radius of Earth in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getLocationGuessTotal(results: LocationGuessResult[]) {
  return results.reduce((total, result) => total + result.roundScore, 0);
}

export function getLocationGuessStreamListing(index: number, deck: LocationGuessListing[] = LOCATION_GUESS_DECK) {
  if (deck.length === 0) return LOCATION_GUESS_DECK[0];
  const safeIndex = ((Math.trunc(index) % deck.length) + deck.length) % deck.length;
  return deck[safeIndex];
}

export function normalizePropertyForLocationGuess(property: Record<string, any>): LocationGuessListing | null {
  const coordinates = property.location_geo?.coordinates;
  if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
    return null;
  }

  const longitude = Number(coordinates[0]);
  const latitude = Number(coordinates[1]);
  if (!isValidCoordinate(longitude, latitude)) return null;
  
  const image = getPrimaryPropertyImage(property);
  const location = property.location || {};
  const city = cleanText(location.city || property.city);
  const type = cleanText(property.type || property.propertyType || 'Property');

  if (!image || !city) return null;

  const acreage = getOptionalNumber(property.acreage ?? property.acres ?? property.lot_acres ?? property.metadata?.acreage);
  const squareFeet = getOptionalNumber(property.square_feet ?? property.squareFeet ?? property.sqft);
  const beds = getOptionalNumber(property.beds ?? property.bedrooms);
  const baths = getOptionalNumber(property.baths ?? property.bathrooms);
  const yearBuilt = getOptionalNumber(property.year_built ?? property.yearBuilt ?? property.metadata?.yearBuilt);

  return {
    id: String(property._id || property.id || property.mls_id || `${city}-${type}`),
    title: cleanText(property.name || property.title || `${city} ${type}`),
    city,
    county: cleanText(location.county || property.county || city),
    image,
    actualCoordinates: [longitude, latitude],
    beds: beds ?? 0,
    baths: baths ?? 0,
    squareFeet: squareFeet ?? 0,
    acreage: acreage ?? undefined,
    yearBuilt: yearBuilt ?? 0,
    propertyType: type,
    signal: `Find this ${type} in ${city}.`,
    source: cleanText(property.source || property.metadata?.provider || 'Property Grid')
  };
}

function getPrimaryPropertyImage(property: Record<string, any>) {
  const images = Array.isArray(property.images) ? property.images : [];
  return images
    .map((candidate) => typeof candidate === 'string' ? candidate.trim() : '')
    .find(isUsableGameImage) || '';
}

function getOptionalNumber(value: unknown) {
  const numeric = typeof value === 'string' ? Number(value.replace(/[^\d.]/g, '')) : Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function cleanText(value: unknown) {
  return String(value || '').trim();
}

function isUsableGameImage(src: string) {
  return src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/images/');
}

function isValidCoordinate(longitude: number, latitude: number) {
  return (
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  );
}
