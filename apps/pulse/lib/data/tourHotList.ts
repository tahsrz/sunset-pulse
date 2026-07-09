import 'server-only';

import { tourHotListConfig } from '@/config/tour_hot_list';
import { hasUsableRemoteListingImage, type Listing } from '@/lib/data/listingContract';
import { getListingById, searchListings } from '@/lib/data/listingRepository';
import { getStoredTourHotList } from '@/lib/data/tourHotListStore';

export type TourHotListTarget =
  | { kind: 'mlsId'; value: string }
  | { kind: 'address'; value: string };

export type TourHotListResult = {
  listings: Listing[];
  targets: TourHotListTarget[];
  unresolved: TourHotListTarget[];
  skipped: Array<{
    target?: TourHotListTarget;
    listingId?: string;
    reason: 'not_found' | 'not_mls' | 'not_active' | 'missing_remote_image' | 'duplicate';
  }>;
  generatedAt: string;
};

export type TourHotListInput = {
  mlsIds?: string[];
  addresses?: string[];
  rawMlsIds?: string;
  rawAddresses?: string;
};

const ACTIVE_STATUSES = new Set([
  'active',
  'active under contract',
  'coming soon',
]);

export async function getTourHotList(options: { limit?: number } = {}): Promise<TourHotListResult> {
  const stored = await getStoredTourHotList();
  const storedTargets = stored?.targets || [];
  if (storedTargets.length > 0) {
    return resolveTourHotListTargets(storedTargets, {
      limit: options.limit ?? stored?.limit ?? tourHotListConfig.fallbackLimit,
    });
  }

  const limit = clamp(options.limit ?? tourHotListConfig.fallbackLimit, 1, 24);
  const targets = getConfiguredTourHotListTargets();
  if (targets.length === 0) {
    return getFallbackMlsHotList(limit);
  }

  return resolveTourHotListTargets(targets, { limit });
}

export async function resolveTourHotListTargets(
  targets: TourHotListTarget[],
  options: { limit?: number } = {}
): Promise<TourHotListResult> {
  const limit = clamp(options.limit ?? tourHotListConfig.fallbackLimit, 1, 24);
  const listings: Listing[] = [];
  const skipped: TourHotListResult['skipped'] = [];
  const unresolved: TourHotListTarget[] = [];
  const seen = new Set<string>();
  const normalizedTargets = dedupeTargets(targets).slice(0, 50);
  const addressCandidates = await getAddressCandidatePool(normalizedTargets);

  for (const target of normalizedTargets) {
    if (listings.length >= limit) break;

    const listing = target.kind === 'mlsId'
      ? await getListingById(target.value)
      : findBestAddressMatch(target.value, addressCandidates);

    if (!listing) {
      unresolved.push(target);
      skipped.push({ target, reason: 'not_found' });
      continue;
    }

    const validation = validateHotListListing(listing);
    if (validation) {
      skipped.push({ target, listingId: listing.id, reason: validation });
      continue;
    }

    const key = listing.mls_id ? `mls:${listing.mls_id}` : `id:${listing.id}`;
    if (seen.has(key)) {
      skipped.push({ target, listingId: listing.id, reason: 'duplicate' });
      continue;
    }

    seen.add(key);
    listings.push(listing);
  }

  return {
    listings,
    targets: normalizedTargets,
    unresolved,
    skipped,
    generatedAt: new Date().toISOString(),
  };
}

export function parseTourHotListTargets(input: TourHotListInput): TourHotListTarget[] {
  const mlsIds = [
    ...(input.mlsIds || []),
    ...splitList(input.rawMlsIds, /[\n,;|]+/),
  ];
  const addresses = [
    ...(input.addresses || []),
    ...splitList(input.rawAddresses, /[\n;|]+/),
  ];

  return [
    ...uniqueStrings(mlsIds).map((value) => ({ kind: 'mlsId' as const, value })),
    ...uniqueStrings(addresses).map((value) => ({ kind: 'address' as const, value })),
  ];
}

export function getConfiguredTourHotListTargets(env: NodeJS.ProcessEnv = process.env): TourHotListTarget[] {
  return parseTourHotListTargets({
    mlsIds: tourHotListConfig.mlsIds,
    addresses: tourHotListConfig.addresses,
    rawMlsIds: env.TOUR_HOT_LIST_MLS_IDS,
    rawAddresses: env.TOUR_HOT_LIST_ADDRESSES,
  });
}

export function isTourHotListQualifiedListing(listing: Listing): boolean {
  return validateHotListListing(listing) === null;
}

async function getFallbackMlsHotList(limit: number): Promise<TourHotListResult> {
  const candidates = await searchListings({}, { limit: 500, includeLegacy: false });
  const listings = candidates.filter(isTourHotListQualifiedListing).slice(0, limit);
  const skipped = candidates
    .filter((listing) => !isTourHotListQualifiedListing(listing))
    .slice(0, 25)
    .map((listing) => ({
      listingId: listing.id,
      reason: validateHotListListing(listing) || 'not_found',
    }));

  return {
    listings,
    targets: [],
    unresolved: [],
    skipped,
    generatedAt: new Date().toISOString(),
  };
}

async function getAddressCandidatePool(targets: TourHotListTarget[]) {
  const addressTargets = targets.filter((target) => target.kind === 'address');
  if (addressTargets.length === 0) return [];

  const cityHints = uniqueStrings(addressTargets.map((target) => inferCityOrZip(target.value)).filter(Boolean));
  const pools = cityHints.length > 0
    ? await Promise.all(cityHints.map((location) => searchListings({ location }, { limit: 500, includeLegacy: false })))
    : [await searchListings({}, { limit: 500, includeLegacy: false })];

  return dedupeListings(pools.flat());
}

function findBestAddressMatch(address: string, listings: Listing[]) {
  const target = normalizeAddress(address);
  if (!target) return null;

  return listings.find((listing) => {
    const listingAddress = normalizeAddress(formatListingAddress(listing));
    const listingName = normalizeAddress(listing.name);
    return listingAddress === target
      || listingAddress.includes(target)
      || target.includes(listingAddress)
      || listingName === target
      || listingName.includes(target);
  }) || null;
}

function validateHotListListing(listing: Listing): TourHotListResult['skipped'][number]['reason'] | null {
  if (listing.source !== 'MLS') return 'not_mls';
  if (!isActiveStatus(listing.listing_status)) return 'not_active';
  if (!hasUsableRemoteListingImage(listing)) return 'missing_remote_image';
  return null;
}

function isActiveStatus(status: string | undefined) {
  return ACTIVE_STATUSES.has(String(status || '').trim().toLowerCase());
}

function formatListingAddress(listing: Listing) {
  return [
    listing.location?.street,
    listing.location?.city,
    listing.location?.state,
    listing.location?.zipcode,
  ].filter(Boolean).join(' ');
}

function normalizeAddress(value: string) {
  return value
    .toLowerCase()
    .replace(/\b(street|st)\b/g, 'st')
    .replace(/\b(avenue|ave)\b/g, 'ave')
    .replace(/\b(road|rd)\b/g, 'rd')
    .replace(/\b(drive|dr)\b/g, 'dr')
    .replace(/\b(lane|ln)\b/g, 'ln')
    .replace(/\b(court|ct)\b/g, 'ct')
    .replace(/\b(boulevard|blvd)\b/g, 'blvd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function inferCityOrZip(address: string) {
  const zip = address.match(/\b\d{5}(?:-\d{4})?\b/)?.[0];
  if (zip) return zip;

  const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) return parts[1];
  return '';
}

function splitList(value: string | undefined, delimiter: RegExp) {
  return String(value || '')
    .split(delimiter)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function dedupeListings(listings: Listing[]) {
  const seen = new Set<string>();
  return listings.filter((listing) => {
    const key = listing.mls_id ? `mls:${listing.mls_id}` : `id:${listing.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeTargets(targets: TourHotListTarget[]) {
  const seen = new Set<string>();
  return targets
    .map((target) => ({ ...target, value: target.value.trim() }))
    .filter((target) => {
      if (!target.value) return false;
      const key = `${target.kind}:${target.value.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}
