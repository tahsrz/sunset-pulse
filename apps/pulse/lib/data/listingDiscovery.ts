import { z } from 'zod';
import { getUsableRemoteListingImages, type Listing } from './listingContract';
import { searchListings, type ListingSearch } from './listingRepository';

const MAX_CANDIDATES = 500;
const DEFAULT_MAX_AGE_HOURS = 24 * 30;
const EARTH_RADIUS_MILES = 3958.8;

const optionalNumber = (schema: z.ZodNumber) => z.preprocess(
  (value) => value === '' || value === null ? undefined : value,
  schema.optional()
);

const stringArray = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const values = Array.isArray(value) ? value : [value];
  return values.flatMap((item) => String(item).split(','));
}, z.array(z.string().trim().min(1).max(80)).max(12).optional());

const boundsSchema = z.object({
  west: z.coerce.number().finite().min(-180).max(180),
  south: z.coerce.number().finite().min(-90).max(90),
  east: z.coerce.number().finite().min(-180).max(180),
  north: z.coerce.number().finite().min(-90).max(90),
}).refine((bounds) => bounds.south < bounds.north, {
  message: 'South must be less than north.',
});

const centerSchema = z.object({
  longitude: z.coerce.number().finite().min(-180).max(180),
  latitude: z.coerce.number().finite().min(-90).max(90),
});

export const listingDiscoveryInputSchema = z.object({
  location: z.string().trim().min(1).max(120).optional(),
  propertyTypes: stringArray,
  priceMin: optionalNumber(z.coerce.number().finite().nonnegative()),
  priceMax: optionalNumber(z.coerce.number().finite().nonnegative()),
  bedsMin: optionalNumber(z.coerce.number().finite().nonnegative()),
  bedsMax: optionalNumber(z.coerce.number().finite().nonnegative()),
  bathsMin: optionalNumber(z.coerce.number().finite().nonnegative()),
  sqftMin: optionalNumber(z.coerce.number().finite().nonnegative()),
  bounds: boundsSchema.optional(),
  center: centerSchema.optional(),
  radiusMiles: optionalNumber(z.coerce.number().finite().positive().max(500)),
  page: z.coerce.number().int().min(1).max(100).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
  maxAgeHours: z.coerce.number().int().min(1).max(24 * 365).default(DEFAULT_MAX_AGE_HOURS),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'distance']).default('newest'),
}).superRefine((input, context) => {
  if (input.priceMin !== undefined && input.priceMax !== undefined && input.priceMin > input.priceMax) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['priceMax'], message: 'Maximum price must be at least the minimum price.' });
  }
  if (input.bedsMin !== undefined && input.bedsMax !== undefined && input.bedsMin > input.bedsMax) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['bedsMax'], message: 'Maximum beds must be at least the minimum beds.' });
  }
  if (Boolean(input.center) !== Boolean(input.radiusMiles)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['center'], message: 'Center and radiusMiles must be provided together.' });
  }
  if (input.sort === 'distance' && !input.center) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['sort'], message: 'Distance sorting requires a center point.' });
  }
});

type NumericInput = string | number | null;

export type ListingDiscoveryInput = {
  location?: string;
  propertyTypes?: string | string[];
  priceMin?: NumericInput;
  priceMax?: NumericInput;
  bedsMin?: NumericInput;
  bedsMax?: NumericInput;
  bathsMin?: NumericInput;
  sqftMin?: NumericInput;
  bounds?: { west: NumericInput; south: NumericInput; east: NumericInput; north: NumericInput };
  center?: { longitude: NumericInput; latitude: NumericInput };
  radiusMiles?: NumericInput;
  page?: NumericInput;
  pageSize?: NumericInput;
  maxAgeHours?: NumericInput;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'distance';
};
export type ParsedListingDiscoveryInput = z.output<typeof listingDiscoveryInputSchema>;
export type DiscoveryListing = Listing & { distance_miles?: number };

export type ListingDiscoveryResult = {
  listings: DiscoveryListing[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    candidateLimitReached: boolean;
  };
  criteria: ParsedListingDiscoveryInput;
  generatedAt: string;
};

type DiscoveryDependencies = {
  search?: typeof searchListings;
  now?: () => Date;
};

export async function discoverListings(
  rawInput: ListingDiscoveryInput = {},
  dependencies: DiscoveryDependencies = {}
): Promise<ListingDiscoveryResult> {
  const criteria = listingDiscoveryInputSchema.parse(rawInput);
  const now = (dependencies.now || (() => new Date()))();
  const updatedSince = new Date(now.getTime() - criteria.maxAgeHours * 60 * 60 * 1000).toISOString();
  const search = dependencies.search || searchListings;
  const coarseFilters: ListingSearch = {
    location: criteria.location,
    propertyType: criteria.propertyTypes?.length === 1 ? criteria.propertyTypes[0] : undefined,
    minPrice: criteria.priceMin,
    maxPrice: criteria.priceMax,
    beds: criteria.bedsMin,
    baths: criteria.bathsMin,
    status: 'Active',
    source: 'MLS',
    updatedSince,
    includeDemo: false,
  };

  const candidates = await search(coarseFilters, { limit: MAX_CANDIDATES, includeLegacy: false });
  const eligible = candidates
    .map((listing) => qualifyListing(listing, criteria, now))
    .filter((listing): listing is DiscoveryListing => Boolean(listing));

  eligible.sort((left, right) => compareListings(left, right, criteria.sort));

  const offset = (criteria.page - 1) * criteria.pageSize;
  const listings = eligible.slice(offset, offset + criteria.pageSize);
  const totalPages = Math.ceil(eligible.length / criteria.pageSize);

  return {
    listings,
    pagination: {
      page: criteria.page,
      pageSize: criteria.pageSize,
      total: eligible.length,
      totalPages,
      hasNextPage: criteria.page < totalPages,
      hasPreviousPage: criteria.page > 1 && totalPages > 0,
      candidateLimitReached: candidates.length === MAX_CANDIDATES,
    },
    criteria,
    generatedAt: now.toISOString(),
  };
}

export function parseListingDiscoverySearchParams(searchParams: URLSearchParams): ListingDiscoveryInput {
  return {
    location: firstPresent(searchParams, ['location', 'city', 'zipcode']),
    propertyTypes: [
      ...searchParams.getAll('propertyType'),
      ...searchParams.getAll('propertyTypes'),
    ],
    priceMin: firstPresent(searchParams, ['priceMin', 'minPrice']),
    priceMax: firstPresent(searchParams, ['priceMax', 'maxPrice']),
    bedsMin: firstPresent(searchParams, ['bedsMin', 'beds']),
    bedsMax: searchParams.get('bedsMax') || undefined,
    bathsMin: firstPresent(searchParams, ['bathsMin', 'baths']),
    sqftMin: searchParams.get('sqftMin') || undefined,
    bounds: parseBounds(searchParams),
    center: parseCenter(searchParams.get('center')),
    radiusMiles: firstPresent(searchParams, ['radiusMiles', 'radius']),
    page: searchParams.get('page') || undefined,
    pageSize: firstPresent(searchParams, ['pageSize', 'limit']),
    maxAgeHours: searchParams.get('maxAgeHours') || undefined,
    sort: (searchParams.get('sort') || undefined) as ListingDiscoveryInput['sort'],
  };
}

function qualifyListing(
  listing: Listing,
  criteria: ParsedListingDiscoveryInput,
  now: Date
): DiscoveryListing | null {
  if (listing.source !== 'MLS' || listing.is_demo || !listing.display_public) return null;
  if (listing.listing_status.trim().toLowerCase() !== 'active') return null;

  const lastUpdated = listing.last_updated ? new Date(listing.last_updated) : null;
  const oldestAllowed = now.getTime() - criteria.maxAgeHours * 60 * 60 * 1000;
  if (!lastUpdated || Number.isNaN(lastUpdated.getTime()) || lastUpdated.getTime() < oldestAllowed) return null;

  const images = getUsableRemoteListingImages(listing);
  if (!images.length) return null;

  if (criteria.location && !matchesLocation(listing, criteria.location)) return null;
  if (criteria.propertyTypes?.length && !criteria.propertyTypes.some((type) => equalsIgnoreCase(type, listing.type))) return null;

  const price = listing.list_price ?? listing.price ?? listing.rates.monthly ?? null;
  if (criteria.priceMin !== undefined && (price === null || price < criteria.priceMin)) return null;
  if (criteria.priceMax !== undefined && (price === null || price > criteria.priceMax)) return null;
  if (criteria.bedsMin !== undefined && (listing.beds === null || listing.beds === undefined || listing.beds < criteria.bedsMin)) return null;
  if (criteria.bedsMax !== undefined && (listing.beds === null || listing.beds === undefined || listing.beds > criteria.bedsMax)) return null;
  if (criteria.bathsMin !== undefined && (listing.baths === null || listing.baths === undefined || listing.baths < criteria.bathsMin)) return null;
  if (criteria.sqftMin !== undefined && (listing.square_feet === null || listing.square_feet === undefined || listing.square_feet < criteria.sqftMin)) return null;

  const coordinates = listing.location_geo?.coordinates;
  const point = coordinates ? [coordinates[0], coordinates[1]] as [number, number] : null;
  if (criteria.bounds && (!point || !isWithinBounds(point, criteria.bounds))) return null;

  let distanceMiles: number | undefined;
  if (criteria.center) {
    if (!point) return null;
    distanceMiles = distanceInMiles(criteria.center, point);
    if (criteria.radiusMiles !== undefined && distanceMiles > criteria.radiusMiles) return null;
  }

  return {
    ...listing,
    images,
    image_url: images[0],
    ...(distanceMiles === undefined ? {} : { distance_miles: round(distanceMiles, 2) }),
  };
}

function compareListings(left: DiscoveryListing, right: DiscoveryListing, sort: ParsedListingDiscoveryInput['sort']) {
  if (sort === 'distance') return compareNullableNumbers(left.distance_miles, right.distance_miles) || stableId(left).localeCompare(stableId(right));
  if (sort === 'price_asc') return compareNullableNumbers(listingPrice(left), listingPrice(right)) || stableId(left).localeCompare(stableId(right));
  if (sort === 'price_desc') return compareNullableNumbers(listingPrice(right), listingPrice(left)) || stableId(left).localeCompare(stableId(right));

  const leftTime = Date.parse(left.last_updated || '') || 0;
  const rightTime = Date.parse(right.last_updated || '') || 0;
  return rightTime - leftTime || stableId(left).localeCompare(stableId(right));
}

function listingPrice(listing: Listing) {
  return listing.list_price ?? listing.price ?? listing.rates.monthly ?? undefined;
}

function compareNullableNumbers(left: number | undefined, right: number | undefined) {
  if (left === undefined && right === undefined) return 0;
  if (left === undefined) return 1;
  if (right === undefined) return -1;
  return left - right;
}

function matchesLocation(listing: Listing, location: string) {
  const needle = location.trim().toLowerCase();
  return [listing.name, listing.location.street, listing.location.city, listing.location.state, listing.location.zipcode]
    .some((value) => value.toLowerCase().includes(needle));
}

function equalsIgnoreCase(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function isWithinBounds(
  [longitude, latitude]: [number, number],
  bounds: z.infer<typeof boundsSchema>
) {
  const withinLongitude = bounds.west <= bounds.east
    ? longitude >= bounds.west && longitude <= bounds.east
    : longitude >= bounds.west || longitude <= bounds.east;
  return withinLongitude && latitude >= bounds.south && latitude <= bounds.north;
}

function distanceInMiles(center: z.infer<typeof centerSchema>, [longitude, latitude]: [number, number]) {
  const latitudeDelta = toRadians(latitude - center.latitude);
  const longitudeDelta = toRadians(longitude - center.longitude);
  const startLatitude = toRadians(center.latitude);
  const endLatitude = toRadians(latitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function parseBounds(searchParams: URLSearchParams): ListingDiscoveryInput['bounds'] {
  const packed = searchParams.get('bounds');
  if (packed !== null) {
    const [west, south, east, north] = packed.split(',');
    return { west, south, east, north };
  }

  const values = ['west', 'south', 'east', 'north'].map((key) => searchParams.get(key));
  if (values.every((value) => value === null)) return undefined;
  return { west: values[0], south: values[1], east: values[2], north: values[3] };
}

function parseCenter(value: string | null): ListingDiscoveryInput['center'] {
  if (value === null) return undefined;
  const [longitude, latitude] = value.split(',');
  return { longitude, latitude };
}

function firstPresent(searchParams: URLSearchParams, keys: string[]) {
  for (const key of keys) {
    const value = searchParams.get(key);
    if (value !== null && value !== '') return value;
  }
  return undefined;
}

function stableId(listing: Listing) {
  return listing.mls_id || listing.id;
}

function toRadians(value: number) {
  return value * Math.PI / 180;
}

function round(value: number, places: number) {
  const multiplier = 10 ** places;
  return Math.round(value * multiplier) / multiplier;
}
