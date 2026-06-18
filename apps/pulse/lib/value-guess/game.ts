export type ValueGuessListing = {
  id: string;
  title: string;
  city: string;
  county: string;
  image: string;
  actualValue: number;
  beds: number;
  baths: number;
  squareFeet: number;
  acreage?: number;
  yearBuilt: number;
  propertyType: string;
  signal: string;
  source?: string;
};

export type ValueGuessResult = {
  guess: number;
  actualValue: number;
  wentOver: boolean;
  keepsStreak: boolean;
  difference: number;
  percentOff: number;
  roundScore: number;
  label: 'perfect' | 'sharp' | 'safe' | 'wide' | 'bust' | 'miss';
};

export const MAX_SAFE_UNDERBID_PERCENT = 0.15;

export const VALUE_GUESS_DECK: ValueGuessListing[] = [
  {
    id: 'north-texas-barndo',
    title: 'Modern Barndominium',
    city: 'Forestburg',
    county: 'Montague',
    image: '/images/properties/barndo1.jpg',
    actualValue: 525000,
    beds: 3,
    baths: 2,
    squareFeet: 2100,
    acreage: 6.2,
    yearBuilt: 2020,
    propertyType: 'Barndominium',
    signal: 'Newer build, acreage utility, and flexible shop-style appeal.'
  },
  {
    id: 'sunset-ridge-classic',
    title: 'Ridge Road Brick Traditional',
    city: 'Sunset',
    county: 'Montague',
    image: '/images/properties/244ridge1.jpg',
    actualValue: 415000,
    beds: 4,
    baths: 3,
    squareFeet: 2440,
    acreage: 1.8,
    yearBuilt: 2004,
    propertyType: 'Single Family',
    signal: 'Updated rural edge, larger lot, small-town inventory pressure.'
  },
  {
    id: 'bowie-starter-ranch',
    title: 'Bowie Starter Ranch Home',
    city: 'Bowie',
    county: 'Montague',
    image: '/images/properties/rhome1.jpg',
    actualValue: 289000,
    beds: 3,
    baths: 2,
    squareFeet: 1760,
    acreage: 0.4,
    yearBuilt: 1998,
    propertyType: 'Single Family',
    signal: 'Entry-level price band with usable yard and clean commuter access.'
  },
  {
    id: 'montague-working-ranch',
    title: 'Working Ranch Residence',
    city: 'Montague',
    county: 'Montague',
    image: '/images/properties/ranch1.jpg',
    actualValue: 875000,
    beds: 4,
    baths: 3,
    squareFeet: 3180,
    acreage: 28,
    yearBuilt: 2012,
    propertyType: 'Ranch',
    signal: 'Acreage premium, improved residence, and livestock-ready land.'
  },
  {
    id: 'sunset-build-site',
    title: 'Sunset Build Site',
    city: 'Sunset',
    county: 'Montague',
    image: '/images/properties/land1.jpg',
    actualValue: 210000,
    beds: 0,
    baths: 0,
    squareFeet: 0,
    acreage: 18.6,
    yearBuilt: 0,
    propertyType: 'Acreage',
    signal: 'Raw land pricing turns on road access, utilities, and usable frontage.'
  }
];

export function parseGuessInput(value: string) {
  const digits = value.replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
}

export function evaluateValueGuess(actualValue: number, guess: number): ValueGuessResult {
  const normalizedActual = Math.max(0, Math.round(actualValue));
  const normalizedGuess = Math.max(0, Math.round(guess));
  const difference = Math.abs(normalizedActual - normalizedGuess);
  const wentOver = normalizedGuess > normalizedActual;
  const percentOff = normalizedActual > 0 ? difference / normalizedActual : 1;
  const keepsStreak = !wentOver && percentOff <= MAX_SAFE_UNDERBID_PERCENT;
  const roundScore = keepsStreak ? Math.max(0, Math.round(1000 - percentOff * 2500)) : 0;

  return {
    guess: normalizedGuess,
    actualValue: normalizedActual,
    wentOver,
    keepsStreak,
    difference,
    percentOff,
    roundScore,
    label: getResultLabel(wentOver, keepsStreak, percentOff)
  };
}

export function getValueGuessTotal(results: ValueGuessResult[]) {
  return results.reduce((total, result) => total + result.roundScore, 0);
}

export function getNextValueGuessStreak(result: ValueGuessResult, currentStreak: number) {
  return result.keepsStreak ? Math.max(0, currentStreak) + 1 : 0;
}

export function getValueGuessStreamListing(index: number, deck: ValueGuessListing[] = VALUE_GUESS_DECK) {
  if (deck.length === 0) {
    throw new Error('Value Guess stream requires at least one listing.');
  }

  const safeIndex = ((Math.trunc(index) % deck.length) + deck.length) % deck.length;
  return deck[safeIndex];
}

export function normalizePropertyForValueGuess(property: Record<string, any>): ValueGuessListing | null {
  const value = getGuessablePropertyValue(property);
  const image = getPrimaryPropertyImage(property);
  const location = property.location || {};
  const city = cleanText(location.city || property.city);
  const type = cleanText(property.type || property.propertyType || 'Property');

  if (!value || !image || !city) {
    return null;
  }

  const acreage = getOptionalNumber(property.acreage ?? property.acres ?? property.lot_acres ?? property.metadata?.acreage);
  const squareFeet = getOptionalNumber(property.square_feet ?? property.squareFeet ?? property.sqft);
  const beds = getOptionalNumber(property.beds ?? property.bedrooms);
  const baths = getOptionalNumber(property.baths ?? property.bathrooms);
  const yearBuilt = getOptionalNumber(property.year_built ?? property.yearBuilt ?? property.metadata?.yearBuilt);

  return {
    id: String(property._id || property.id || property.mls_id || `${city}-${type}-${value}`),
    title: cleanText(property.name || property.title || `${city} ${type}`),
    city,
    county: cleanText(location.county || property.county || city),
    image,
    actualValue: value,
    beds: beds ?? 0,
    baths: baths ?? 0,
    squareFeet: squareFeet ?? 0,
    acreage: acreage ?? undefined,
    yearBuilt: yearBuilt ?? 0,
    propertyType: type,
    signal: buildPropertySignal({ type, source: property.source, acreage, squareFeet, yearBuilt }),
    source: cleanText(property.source || property.metadata?.provider || 'Property Grid')
  };
}

function getResultLabel(wentOver: boolean, keepsStreak: boolean, percentOff: number): ValueGuessResult['label'] {
  if (wentOver) return 'bust';
  if (!keepsStreak) return 'miss';
  if (percentOff === 0) return 'perfect';
  if (percentOff <= 0.03) return 'sharp';
  if (percentOff <= 0.1) return 'safe';
  return 'wide';
}

function getGuessablePropertyValue(property: Record<string, any>) {
  const priceType = String(property.price_type || '').toLowerCase();
  const candidates = [
    property.list_price,
    priceType === 'sale' ? property.price : null,
    priceType === 'sale' ? property.rates?.monthly : null
  ];

  for (const candidate of candidates) {
    const value = getOptionalNumber(candidate);
    if (value && value >= 50000) return Math.round(value);
  }

  return 0;
}

function getPrimaryPropertyImage(property: Record<string, any>) {
  const images = Array.isArray(property.images) ? property.images : [];
  return images
    .map((candidate) => typeof candidate === 'string' ? candidate.trim() : '')
    .find(isUsableGameImage) || '';
}

function getOptionalNumber(value: unknown) {
  const numeric = typeof value === 'string'
    ? Number(value.replace(/[^\d.]/g, ''))
    : Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function cleanText(value: unknown) {
  return String(value || '').trim();
}

function isUsableGameImage(src: string) {
  return src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/images/');
}

function buildPropertySignal(input: { type: string; source?: string; acreage: number | null; squareFeet: number | null; yearBuilt: number | null }) {
  const signals = [];
  if (input.source === 'MLS') signals.push('synced MLS listing');
  else signals.push('local property grid');

  if (input.acreage && input.acreage >= 5) signals.push('acreage premium');
  if (input.squareFeet && input.squareFeet >= 2500) signals.push('larger interior footprint');
  if (input.yearBuilt && input.yearBuilt >= 2018) signals.push('newer construction signal');
  if (/land|acreage|ranch/i.test(input.type)) signals.push('land utility drives the value');

  return `${capitalize(input.type)} from the ${signals.join(', ')}.`;
}

function capitalize(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Property';
}
