export type ListingSignalStatus =
  | 'Active'
  | 'Expired'
  | 'Canceled'
  | 'Withdrawn'
  | 'Pending'
  | 'Closed'
  | 'Sold'
  | 'Unavailable';

export type ProspectingVector = 'expired_restart' | 'stale_dom' | 'absentee_owner' | 'open_house';

export type ProspectingUrgency = 'today' | 'this_week' | 'watch';

export type ListingSignal = {
  listingId: string;
  address?: string | null;
  city?: string | null;
  subdivision?: string | null;
  status: ListingSignalStatus | string;
  statusChangeDate?: string | null;
  listDate?: string | null;
  daysOnMarket?: number | null;
  originalListPrice?: number | null;
  currentListPrice?: number | null;
  propertyType?: string | null;
  vacant?: boolean | null;
  brokerageInventory?: boolean | null;
};

export type TaxOwnershipSignal = {
  ownerName?: string | null;
  mailingAddress?: string | null;
  propertyAddress?: string | null;
  ownerOccupied?: boolean | null;
  lastSaleDate?: string | null;
};

export type ProspectingInput = {
  listing: ListingSignal;
  taxRecord?: TaxOwnershipSignal | null;
  asOf?: Date;
};

export type ProspectingOpportunity = {
  vector: ProspectingVector;
  label: string;
  urgency: ProspectingUrgency;
  score: number;
  reasons: string[];
  nextAction: string;
};

export type ProspectingCandidate = {
  listingId: string;
  address: string;
  market: string;
  priorityScore: number;
  opportunities: ProspectingOpportunity[];
};

const EXPIRED_STATUSES = new Set(['expired', 'canceled', 'cancelled', 'withdrawn']);

export function classifyProspectingCandidate({
  listing,
  taxRecord,
  asOf = new Date(),
}: ProspectingInput): ProspectingCandidate {
  const opportunities = [
    deriveExpiredOpportunity(listing, asOf),
    deriveStaleDomOpportunity(listing),
    deriveAbsenteeOpportunity(listing, taxRecord, asOf),
    deriveOpenHouseOpportunity(listing),
  ].filter(Boolean) as ProspectingOpportunity[];

  opportunities.sort((a, b) => b.score - a.score);

  return {
    listingId: listing.listingId,
    address: listing.address || taxRecord?.propertyAddress || 'Address pending',
    market: [listing.subdivision, listing.city].filter(Boolean).join(', ') || listing.city || 'Market pending',
    priorityScore: Math.min(100, Math.max(0, Math.round(opportunities[0]?.score || 0))),
    opportunities,
  };
}

export function buildDailyProspectingQueue(
  inputs: ProspectingInput[],
  limit = 25,
): ProspectingCandidate[] {
  return inputs
    .map(classifyProspectingCandidate)
    .filter((candidate) => candidate.opportunities.length > 0)
    .sort((a, b) => b.priorityScore - a.priorityScore || a.address.localeCompare(b.address))
    .slice(0, limit);
}

export function getLeadVectorLabel(vector: ProspectingVector) {
  switch (vector) {
    case 'expired_restart':
      return 'Expired / Canceled / Withdrawn';
    case 'stale_dom':
      return 'High Days on Market';
    case 'absentee_owner':
      return 'Absentee Owner';
    case 'open_house':
      return 'Open House Inventory';
  }
}

function deriveExpiredOpportunity(listing: ListingSignal, asOf: Date): ProspectingOpportunity | null {
  if (!EXPIRED_STATUSES.has(String(listing.status).toLowerCase())) return null;

  const ageDays = daysSince(listing.statusChangeDate, asOf);
  if (ageDays === null || ageDays > 120) return null;

  const inPrimaryWindow = ageDays >= 30 && ageDays <= 90;
  const priceDrop = getPriceDropPercent(listing);

  return {
    vector: 'expired_restart',
    label: getLeadVectorLabel('expired_restart'),
    urgency: inPrimaryWindow ? 'today' : 'this_week',
    score: clampScore(74 + (inPrimaryWindow ? 12 : 0) + (priceDrop >= 3 ? 6 : 0)),
    reasons: [
      `Status changed ${ageDays} days ago`,
      inPrimaryWindow ? 'Inside 30-90 day restart window' : 'Outside primary restart window but still recent',
      priceDrop >= 3 ? `${priceDrop}% price movement signals motivation` : 'Pricing reset conversation available',
    ],
    nextAction: 'Pull hyper-local comps, confirm ownership record, and start expired seller outreach.',
  };
}

function deriveStaleDomOpportunity(listing: ListingSignal): ProspectingOpportunity | null {
  if (String(listing.status).toLowerCase() !== 'active') return null;
  const dom = Number(listing.daysOnMarket || 0);
  if (dom <= 45) return null;

  const priceDrop = getPriceDropPercent(listing);
  return {
    vector: 'stale_dom',
    label: getLeadVectorLabel('stale_dom'),
    urgency: dom >= 75 ? 'today' : 'this_week',
    score: clampScore(62 + Math.min(18, Math.floor((dom - 45) / 5)) + (priceDrop >= 4 ? 8 : 0)),
    reasons: [
      `${dom} days on market`,
      dom >= 75 ? 'Long exposure period suggests frustration or repositioning need' : 'Past the stale inventory threshold',
      priceDrop >= 4 ? `${priceDrop}% price reduction already visible` : 'No major price correction detected',
    ],
    nextAction: 'Prepare repositioning notes and buyer-side leverage points before contacting or previewing.',
  };
}

function deriveAbsenteeOpportunity(
  listing: ListingSignal,
  taxRecord: TaxOwnershipSignal | null | undefined,
  asOf: Date,
): ProspectingOpportunity | null {
  if (!taxRecord) return null;

  const addressMismatch = addressesDiffer(taxRecord.mailingAddress, taxRecord.propertyAddress || listing.address);
  const explicitlyAbsentee = taxRecord.ownerOccupied === false;
  const holdYears = yearsSince(taxRecord.lastSaleDate, asOf);
  const longHold = holdYears !== null && holdYears >= 5;

  if (!longHold || (!addressMismatch && !explicitlyAbsentee)) return null;

  return {
    vector: 'absentee_owner',
    label: getLeadVectorLabel('absentee_owner'),
    urgency: holdYears >= 8 ? 'today' : 'this_week',
    score: clampScore(66 + Math.min(16, Math.floor((holdYears - 5) * 2)) + (explicitlyAbsentee ? 6 : 0)),
    reasons: [
      `${holdYears.toFixed(1)} year hold period`,
      explicitlyAbsentee ? 'Tax record marks owner as non-owner occupied' : 'Mailing address differs from property address',
      'Potential landlord friction, equity, or portfolio cleanup conversation',
    ],
    nextAction: 'Generate owner equity estimate and send a rental-property market evaluation sequence.',
  };
}

function deriveOpenHouseOpportunity(listing: ListingSignal): ProspectingOpportunity | null {
  if (String(listing.status).toLowerCase() !== 'active') return null;
  if (!listing.brokerageInventory && !listing.vacant) return null;

  return {
    vector: 'open_house',
    label: getLeadVectorLabel('open_house'),
    urgency: listing.vacant ? 'today' : 'this_week',
    score: clampScore(58 + (listing.vacant ? 12 : 0) + (listing.brokerageInventory ? 8 : 0)),
    reasons: [
      listing.vacant ? 'Vacant property can support fast open-house scheduling' : 'Active listing can anchor neighborhood prospecting',
      listing.brokerageInventory ? 'Brokerage inventory source' : 'Host permission still required',
      'Supports directional signs, neighbor preview, and kiosk capture workflow',
    ],
    nextAction: 'Request hosting permission, schedule a two-hour block, and build the neighborhood preview flyer.',
  };
}

function getPriceDropPercent(listing: ListingSignal) {
  const original = Number(listing.originalListPrice || 0);
  const current = Number(listing.currentListPrice || 0);
  if (original <= 0 || current <= 0 || current >= original) return 0;
  return Math.round(((original - current) / original) * 100);
}

function addressesDiffer(a?: string | null, b?: string | null) {
  const left = normalizeAddress(a);
  const right = normalizeAddress(b);
  if (!left || !right) return false;
  return left !== right;
}

function normalizeAddress(value?: string | null) {
  return String(value || '')
    .toLowerCase()
    .replace(/\b(street|st)\b/g, 'st')
    .replace(/\b(avenue|ave)\b/g, 'ave')
    .replace(/\b(road|rd)\b/g, 'rd')
    .replace(/\b(drive|dr)\b/g, 'dr')
    .replace(/\b(court|ct)\b/g, 'ct')
    .replace(/[^a-z0-9]/g, '');
}

function daysSince(value: string | null | undefined, asOf: Date) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.max(0, Math.floor((asOf.getTime() - parsed.getTime()) / 86_400_000));
}

function yearsSince(value: string | null | undefined, asOf: Date) {
  const days = daysSince(value, asOf);
  return days === null ? null : days / 365.25;
}

function clampScore(score: number) {
  return Math.min(100, Math.max(0, Math.round(score)));
}
