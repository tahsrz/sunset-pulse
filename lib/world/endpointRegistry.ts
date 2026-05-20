export type WorldEndpointIcon =
  | 'search'
  | 'radio'
  | 'archive'
  | 'atlas'
  | 'valuation'
  | 'saved'
  | 'leads'
  | 'messages'
  | 'jamie'
  | 'studio'
  | 'anomaly';

export interface WorldEndpoint {
  id: string;
  label: string;
  district: string;
  description: string;
  route: string;
  apiPath?: string;
  previewUrl?: string;
  method: 'GET' | 'POST' | 'MIXED';
  authRequired?: boolean;
  color: string;
  glow: string;
  icon: WorldEndpointIcon;
  position: [number, number, number];
  fallbackMetric: string;
  fallbackDetail: string;
}

export interface WorldQueryLaunch {
  label: string;
  route: string;
  intent: string;
}

export const WORLD_ENDPOINTS: WorldEndpoint[] = [
  {
    id: 'property-grid',
    label: 'Property Search',
    district: 'Search',
    description: 'Browse inventory, internal listings, and MLS-backed property search from one entry point.',
    route: '/properties',
    apiPath: '/api/properties',
    previewUrl: '/api/properties?page=1&pageSize=6',
    method: 'MIXED',
    color: '#3fb7a3',
    glow: 'rgba(63, 183, 163, 0.42)',
    icon: 'search',
    position: [-4.2, 0.4, 0.6],
    fallbackMetric: 'Listings available',
    fallbackDetail: 'Opens the primary property browsing workflow.'
  },
  {
    id: 'idx-hot-moving',
    label: 'Active IDX Listings',
    district: 'IDX Search',
    description: 'Current listings from the regional IDX/MLS feed.',
    route: '/idx',
    apiPath: '/api/idx/hot-moving',
    previewUrl: '/api/idx/hot-moving',
    method: 'MIXED',
    color: '#ffb36b',
    glow: 'rgba(255, 179, 107, 0.42)',
    icon: 'radio',
    position: [-2.1, 1.1, -2.4],
    fallbackMetric: 'MLS feed',
    fallbackDetail: 'Shows current IDX listing activity.'
  },
  {
    id: 'tah-archive',
    label: 'TAH Archive',
    district: 'Knowledge Library',
    description: 'Searchable cartridge memory and domain knowledge for the platform.',
    route: '/tah',
    apiPath: '/api/tah',
    previewUrl: '/api/tah',
    method: 'MIXED',
    color: '#f6d365',
    glow: 'rgba(246, 211, 101, 0.36)',
    icon: 'archive',
    position: [0, 0.7, -3.1],
    fallbackMetric: 'Archive ready',
    fallbackDetail: 'Opens the cartridge library and TAH search surface.'
  },
  {
    id: 'atlas',
    label: 'Atlas',
    district: 'Market Map',
    description: 'Map of published knowledge, saved research, and market domains.',
    route: '/atlas',
    apiPath: '/api/tah/atlas/manifest',
    previewUrl: '/api/tah/atlas/manifest',
    method: 'GET',
    color: '#38bdf8',
    glow: 'rgba(56, 189, 248, 0.38)',
    icon: 'atlas',
    position: [2.3, 1.2, -2.2],
    fallbackMetric: 'Atlas manifest',
    fallbackDetail: 'Opens the market map.'
  },
  {
    id: 'valuation',
    label: 'Valuation',
    district: 'Valuation',
    description: 'Confirmed valuation data and property estimate workflow.',
    route: '/valuation',
    apiPath: '/api/valuation',
    previewUrl: '/api/valuation',
    method: 'MIXED',
    color: '#b8a7ff',
    glow: 'rgba(184, 167, 255, 0.4)',
    icon: 'valuation',
    position: [4.2, 0.5, 0.5],
    fallbackMetric: 'Estimate engine',
    fallbackDetail: 'Opens the valuation workflow.'
  },
  {
    id: 'saved-assets',
    label: 'Saved Properties',
    district: 'Watchlist',
    description: 'Authenticated bookmark and saved-property workflow.',
    route: '/profile',
    apiPath: '/api/bookmarks',
    previewUrl: '/api/bookmarks',
    method: 'MIXED',
    authRequired: true,
    color: '#f29ab4',
    glow: 'rgba(242, 154, 180, 0.38)',
    icon: 'saved',
    position: [3.4, -0.8, 2.5],
    fallbackMetric: 'Login-gated',
    fallbackDetail: 'Opens saved properties after authentication.'
  },
  {
    id: 'lead-command',
    label: 'Lead Management',
    district: 'Leads',
    description: 'Lead tracking, engagement, and follow-up workflow.',
    route: '/lead-gen',
    apiPath: '/api/leads',
    previewUrl: '/api/leads',
    method: 'MIXED',
    authRequired: true,
    color: '#60a5fa',
    glow: 'rgba(96, 165, 250, 0.38)',
    icon: 'leads',
    position: [1.3, -1.1, 3.2],
    fallbackMetric: 'Login required',
    fallbackDetail: 'Opens the lead management board.'
  },
  {
    id: 'messages',
    label: 'Messages',
    district: 'Messages',
    description: 'Unread-message status and client conversation workflow.',
    route: '/messages',
    apiPath: '/api/messages/unread-count',
    previewUrl: '/api/messages/unread-count',
    method: 'GET',
    authRequired: true,
    color: '#34d399',
    glow: 'rgba(52, 211, 153, 0.34)',
    icon: 'messages',
    position: [-1.2, -1.1, 3.3],
    fallbackMetric: 'Private messages',
    fallbackDetail: 'Opens authenticated messages.'
  },
  {
    id: 'jamie-briefing',
    label: 'Jamie Summary',
    district: 'Dashboard',
    description: 'Daily market summary and platform guidance.',
    route: '/dashboard',
    apiPath: '/api/jamie/briefing',
    previewUrl: '/api/jamie/briefing',
    method: 'GET',
    color: '#c084fc',
    glow: 'rgba(192, 132, 252, 0.38)',
    icon: 'jamie',
    position: [-3.3, -0.7, 2.4],
    fallbackMetric: 'Summary available',
    fallbackDetail: 'Opens the dashboard with Jamie context nearby.'
  },
  {
    id: 'studio',
    label: 'Studio',
    district: 'Studio',
    description: 'Production render workflow for generated media and recipes.',
    route: '/studio',
    apiPath: '/api/studio',
    method: 'POST',
    color: '#fb7185',
    glow: 'rgba(251, 113, 133, 0.36)',
    icon: 'studio',
    position: [-4.7, -0.6, -1.9],
    fallbackMetric: 'POST workflow',
    fallbackDetail: 'Upload-driven render endpoint. Enter the studio to operate it.'
  },
  {
    id: 'market-anomaly',
    label: 'Market Alerts',
    district: 'Alerts',
    description: 'Market alert intake for notifications, lead matching, and monitoring.',
    route: '/dashboard',
    apiPath: '/api/market-anomaly',
    method: 'POST',
    color: '#f97316',
    glow: 'rgba(249, 115, 22, 0.38)',
    icon: 'anomaly',
    position: [4.7, -0.6, -1.8],
    fallbackMetric: 'Alert workflow',
    fallbackDetail: 'Alert intake connected to the dashboard workflow.'
  }
];

export const WORLD_QUERY_LAUNCHES: WorldQueryLaunch[] = [
  {
    label: 'North Texas homes under $350k',
    intent: 'Starter search',
    route: '/properties/search-results?location=North%20Texas&propertyType=House&maxPrice=350000'
  },
  {
    label: 'Active land near Bowie',
    intent: 'Land search',
    route: '/properties/search-results?location=Bowie&propertyType=Land&includeMLS=true'
  },
  {
    label: 'RV parks with hookups',
    intent: 'RV income',
    route: '/properties/search-results?location=North%20Texas&propertyType=RV%20Park&amenities=RV%20Hookup'
  },
  {
    label: 'Active IDX listings',
    intent: 'Market activity',
    route: '/idx'
  },
  {
    label: 'Saved properties',
    intent: 'Watchlist',
    route: '/profile'
  },
  {
    label: 'Run valuation',
    intent: 'Estimate',
    route: '/valuation'
  }
];
