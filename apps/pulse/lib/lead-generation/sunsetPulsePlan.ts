import type { ProspectingInput } from './prospectingEngine';

export type DailyTimeBlock = {
  time: string;
  name: string;
  outcome: string;
  automation: string;
};

export type OperatingVector = {
  id: string;
  name: string;
  target: string;
  trigger: string;
  action: string;
  systemWork: string[];
};

export type WeeklyMilestone = {
  week: string;
  focus: string;
  shippedOutcome: string;
};

export const dailyTimeBlocks: DailyTimeBlock[] = [
  {
    time: '08:30 - 09:00',
    name: 'Market Intelligence',
    outcome: 'Review MLS hotsheet, expired changes, price cuts, and stale DOM clusters.',
    automation: 'Run hotsheet ingestion and refresh the prospecting queue.',
  },
  {
    time: '09:00 - 11:30',
    name: 'Active Prospecting',
    outcome: 'Work expireds, absentee owners, stale listings, and door-knock targets.',
    automation: 'Sort contacts by priority score and generate next-best action scripts.',
  },
  {
    time: '11:30 - 13:00',
    name: 'Follow-Up Pipeline',
    outcome: 'Touch every lead less than 14 days old and escalate hot conversations.',
    automation: 'Pull new, contacted, and nurture leads from the lead operating system.',
  },
  {
    time: '13:00 - 15:00',
    name: 'Networking / Open House Prep',
    outcome: 'Secure host permission, print preview flyers, route signs, and confirm kiosk flow.',
    automation: 'Build open-house runbooks from brokerage inventory and neighborhood context.',
  },
];

export const operatingVectors: OperatingVector[] = [
  {
    id: 'expired_restart',
    name: 'Expired / Canceled / Withdrawn Listings',
    target: 'Sellers whose prior listing failed to close in the last 30-90 days.',
    trigger: 'MLS status change plus ownership validation from authorized county/tax data.',
    action: 'Send pricing reset outreach anchored to micro-comps and days-since-expired timing.',
    systemWork: [
      'Detect status changes from hotsheet or RESO Web API feed',
      'Cross-reference property owner and mailing address',
      'Generate pricing-reset script and direct mail task',
    ],
  },
  {
    id: 'stale_dom',
    name: 'High Days on Market',
    target: 'Active listings over 45 DOM with visible motivation or weak positioning.',
    trigger: 'Active MLS listing where DOM exceeds the stale threshold.',
    action: 'Prepare repositioning notes for seller-side pitch or leverage points for buyer-side representation.',
    systemWork: [
      'Track DOM, price movement, and subdivision exposure',
      'Cluster stale inventory by micro-market',
      'Create repositioning checklist and buyer leverage brief',
    ],
  },
  {
    id: 'absentee_owner',
    name: 'Absentee Owners',
    target: 'Non-owner occupied properties held for 5+ years.',
    trigger: 'Mailing address differs from property address or tax record marks non-owner occupied.',
    action: 'Launch landlord equity and rental-property market evaluation sequence.',
    systemWork: [
      'Normalize owner and property addresses',
      'Calculate hold period and likely equity conversation angle',
      'Queue direct mail, email, or call task with compliance tags',
    ],
  },
  {
    id: 'open_house',
    name: 'Brokerage Inventory Open House Engine',
    target: 'Vacant or active brokerage listings that can anchor weekend lead capture.',
    trigger: 'Monday inventory review plus host permission from listing agent.',
    action: 'Run neighbor preview, directional sign plan, and digital kiosk check-in.',
    systemWork: [
      'Request host permission every Monday',
      'Create 20-30 door-knock targets around the listing',
      'Capture kiosk leads into auto-nurture and lead inbox',
    ],
  },
];

export const weeklyMilestones: WeeklyMilestone[] = [
  {
    week: 'Week 1',
    focus: 'Manual execution discipline',
    shippedOutcome: 'Daily hotsheet import, 25-person prospecting queue, and one open-house target.',
  },
  {
    week: 'Week 2',
    focus: 'Follow-up consistency',
    shippedOutcome: 'Lead statuses, 14-day follow-up queue, and reusable expired/absentee scripts.',
  },
  {
    week: 'Week 3',
    focus: 'Open-house conversion',
    shippedOutcome: 'Kiosk intake, neighbor preview flyer, sign checklist, and auto-nurture entry.',
  },
  {
    week: 'Week 4',
    focus: 'Measure and tighten',
    shippedOutcome: 'Conversion review by source, booked appointments, and repeatable weekly cadence.',
  },
];

export const openHouseRunbook = [
  'Ask listing agent for hosting permission every Monday morning.',
  'Choose one vacant or high-visibility active listing by Wednesday.',
  'Create neighborhood preview flyer with market snapshot and QR check-in.',
  'Place 10-15 directional signs and door-knock 20-30 nearby homes.',
  'Require kiosk check-in before market snapshot, off-market list, or follow-up details.',
  'Move kiosk leads into new, contacted, touring, or nurture within 24 hours.',
];

export const complianceGuardrails = [
  'Use authorized MLS, RESO, brokerage, and county/tax sources only.',
  'Respect MLS display rules, broker instructions, consent requirements, and do-not-call constraints.',
  'Treat outreach scripts as drafts that must be reviewed before sending.',
];

export const sampleProspectingInputs: ProspectingInput[] = [
  {
    listing: {
      listingId: 'SP-EXPIRED-042',
      address: '1840 Canyon Ridge Dr',
      city: 'Killeen',
      subdivision: 'Cedar Ridge',
      status: 'Expired',
      statusChangeDate: '2026-06-18',
      daysOnMarket: 94,
      originalListPrice: 315000,
      currentListPrice: 299000,
      propertyType: 'Single Family',
    },
  },
  {
    listing: {
      listingId: 'SP-STALE-118',
      address: '5229 Lakeview Court',
      city: 'Temple',
      subdivision: 'Lake Pointe',
      status: 'Active',
      statusChangeDate: '2026-05-05',
      daysOnMarket: 81,
      originalListPrice: 410000,
      currentListPrice: 389000,
      propertyType: 'Single Family',
      brokerageInventory: true,
    },
  },
  {
    listing: {
      listingId: 'SP-ABS-207',
      address: '720 Meadow Bend Rd',
      city: 'Belton',
      subdivision: 'Meadow Bend',
      status: 'Active',
      daysOnMarket: 23,
      propertyType: 'Single Family',
    },
    taxRecord: {
      ownerName: 'Private Owner',
      propertyAddress: '720 Meadow Bend Rd, Belton, TX',
      mailingAddress: '1148 North Loop, Austin, TX',
      ownerOccupied: false,
      lastSaleDate: '2017-04-10',
    },
  },
  {
    listing: {
      listingId: 'SP-OH-031',
      address: '301 Sunset Meadow Ln',
      city: 'Harker Heights',
      subdivision: 'Sunset Meadows',
      status: 'Active',
      daysOnMarket: 12,
      vacant: true,
      brokerageInventory: true,
      propertyType: 'Single Family',
    },
  },
];
