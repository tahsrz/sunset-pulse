/** Source-backed navigation inventory, not an authorization or production-health check. */
export type RouteAccess = 'public' | 'account' | 'operator' | 'admin' | 'realtor' | 'cms' | 'staff';
export const routeAccessLabels: Record<RouteAccess, string> = {
  public: 'Public entry', account: 'Sign-in required', operator: 'Operator access',
  admin: 'Administrative screen', realtor: 'Realtor role', cms: 'CMS WIP policy', staff: 'Staff / PIN',
};
export type AppRoute = {
  path: string;
  label: string;
  group: string;
  access: RouteAccess;
  kind: 'page' | 'context' | 'redirect' | 'resource';
  href?: string;
  note: string;
};
type PageEntry = [path: string, label: string, access?: RouteAccess, note?: string];
function pages(group: string, entries: PageEntry[]): AppRoute[] {
  return entries.map(([path, label, access = 'public', note = '']) => ({ path, label, group, access, kind: 'page', href: path, note }));
}
function context(path: string, label: string, group: string, access: RouteAccess, note: string, href?: string): AppRoute {
  return { path, label, group, access, kind: 'context', note, href };
}

export const appRoutes: readonly AppRoute[] = [
  ...pages('Discover', [
    ['/', 'Home'], ['/explorer', 'Explorer'], ['/properties', 'Properties'],
    ['/properties/search-results', 'Property search results', 'public', 'Uses optional search query filters.'],
    ['/listings', 'Listings'], ['/idx', 'IDX Search', 'account'],
    ['/tour-studio', 'Tour Studio'], ['/valuation', 'Property valuation', 'public', 'Account-backed actions may require sign-in.'],
    ['/contact', 'Contact'], ['/investors', 'Investors'],
  ]),
  ...pages('Intelligence and chat', [
    ['/agent', 'Agent Console'], ['/command-center', 'Agent Workspace'], ['/atlas', 'Atlas'],
    ['/jamie-chat', 'Jamie Chat workspace'], ['/jamie-console', 'Jamie Console'],
    ['/jamie-vibes', 'Jamie Vibes'], ['/sunset-chat', 'Sunset Chat'],
    ['/insights', 'Jamie Insights'], ['/tah', 'TAH library'], ['/abidan', 'Abidan'],
    ['/abidan/war-room', 'Abidan War Room', 'operator', 'Middleware permits realtor, operator, or admin.'],
    ['/scythe', 'Scythe', 'account'],
    ['/news/tah', 'News TAH', 'public', 'A source article query supplies the story.'],
  ]),
  ...pages('Creative and spatial', [
    ['/spatial-lab', 'Spatial Lab'], ['/spatial-lab/deck', 'Deck Signals'],
    ['/studio', 'Voice Studio'], ['/reraster', 'Reraster video studio'],
    ['/storytime', 'Storytime'], ['/worldoftah', 'World of TAH'], ['/vibe-lab', 'Vibe Lab'],
    ['/demo', 'Demo'], ['/pitch', 'Pitch'], ['/identity-test', 'Identity test', 'public', 'Diagnostic / experimental screen.'],
  ]),
  ...pages('Games', [
    ['/play-jamie', 'Play Jamie'], ['/play-jamie/chess', 'Chess with Jamie'],
    ['/play-jamie/poker', 'Poker with Jamie'], ['/play-jamie/tetris', 'Block Drop'],
    ['/play-jamie/volley', 'Sunset Volley'], ['/beach-volleyball', 'Beach Volleyball'],
    ['/value-guess', 'Value Guess'], ['/location-guess', 'Location Guess'],
    ['/pulse-quest', 'Pulse Quest'], ['/retail-clash', 'Retail Clash'],
  ]),
  ...pages('Food and scheduling', [
    ['/grill', 'Grill ordering'], ['/cart', 'Cart'], ['/counter', 'Counter'],
    ['/grill/kds', 'Kitchen display', 'staff', 'Uses the existing kitchen access flow.'],
    ['/sms-opt-in', 'SMS opt-in'],
  ]),
  ...pages('Account and business', [
    ['/login', 'Sign in'], ['/register', 'Register'], ['/profile', 'Profile', 'account'],
    ['/dashboard', 'Realtor dashboard', 'realtor', 'Middleware requires the realtor profile role.'],
    ['/collections', 'Collections', 'account'], ['/properties/saved', 'Saved properties', 'account'],
    ['/properties/add', 'Add property', 'account'], ['/messages', 'Messages', 'account'],
    ['/lead-gen', 'Lead generation', 'account'], ['/premium', 'Premium plans'],
    ['/contracts/promulgated', 'Promulgated contracts'],
    ['/contracts/promulgated/templates', 'Contract templates'],
    ['/contracts/promulgated/setup', 'Contract setup', 'account', 'Choose a contract and property in the setup workflow.'],
    ['/contracts/representation', 'Representation agreement'], ['/iabs', 'Brokerage services disclosure'],
  ]),
  ...pages('Vibe CMS', [
    ['/vibes', 'All Vibes', 'cms'], ['/vibes/new', 'Add Vibe', 'cms'], ['/vibes/taxonomy', 'Vibe taxonomy', 'cms'],
  ]),
  ...pages('Operations', [
    ['/admin/research-desk', 'Research Desk', 'operator'],
    ['/admin/lead-drafts', 'Lead drafts', 'operator'], ['/admin/lead-engine', 'Lead Engine', 'operator'],
    ['/admin/agent-leads', 'Agent lead queues', 'operator'], ['/admin/launch-kit', 'Launch Kit', 'operator'],
    ['/admin/site-reviews', 'Site reviews', 'operator'], ['/admin/hot-list', 'Hot List', 'operator'],
    ['/admin/orchestrator', 'Orchestrator', 'operator'],
    ['/admin/profit', 'Profit controls', 'operator', 'Realtor role alone is not sufficient.'],
    ['/admin/intelligence', 'Intelligence configuration', 'admin'], ['/admin/prompts', 'Prompt configuration', 'admin'],
    ['/admin/marketing', 'Marketing', 'admin'], ['/admin/pulse', 'Pulse operations', 'admin'],
    ['/admin/cms', 'Store / POS CMS', 'admin', 'Store controller console, not the Vibe editor.'],
    ['/admin/cms/setup', 'Store / POS setup', 'admin'],
    ['/admin/scheduling', 'Scheduling operations', 'staff', 'Existing staff workflow; excluded from the middleware admin sign-in redirect.'],
  ]),
  context('/properties/[id]', 'Property details', 'Discover', 'public', 'Choose an existing property; requires its ID.', '/properties'),
  context('/properties/[id]/edit', 'Edit property', 'Account and business', 'account', 'Choose a property you can edit; requires its ID.', '/properties'),
  context('/listings/[id]', 'Listing details', 'Discover', 'public', 'Choose an existing listing; requires its ID.', '/listings'),
  context('/lead-gen/[id]', 'Property lead generation', 'Account and business', 'account', 'Choose a property in Lead generation.', '/lead-gen'),
  context('/tah/[slug]', 'TAH cartridge', 'Intelligence and chat', 'public', 'Choose a cartridge; requires its slug.', '/tah'),
  context('/briefing/deck/[slug]', 'Briefing deck', 'Creative and spatial', 'account', 'Open a deck generated by the command workflow.', '/command-center'),
  context('/briefing/render/[id]', 'Rendered briefing', 'Creative and spatial', 'account', 'Open an existing briefing from its generated link.', '/command-center'),
  context('/grill/tracker/[orderId]', 'Order tracker', 'Food and scheduling', 'public', 'Use the tracking link from a real order; requires its order ID.'),
  context('/schedule', 'Schedule', 'Food and scheduling', 'public', 'Use a tenant booking link with its site query parameter.'),
  context('/sign/[token]', 'Sign agreement', 'Account and business', 'public', 'Use the signing link supplied for the agreement; never invent a token.'),
  context('/sites/[site]/[[...path]]', 'Tenant site pages', 'Discover', 'public', 'Use the configured tenant hostname or an existing site ID and optional page path.'),
  context('/onboarding/site', 'Site checkout return', 'Account and business', 'account', 'Checkout return requires its session_id; do not open as a blank setup page.'),
  context('/onboarding/site/setup', 'Site setup', 'Account and business', 'account', 'Use the setup link for an existing provisioned site / checkout session.'),
  ...(['edit', 'preview', 'source', 'revisions', 'compare', 'actions', 'submit', 'publish', 'apply', 'audit'] as const).map((action) =>
    context(`/vibes/[vibeId]/${action}`, `Vibe ${action}`, 'Vibe CMS', 'cms', 'Choose a Vibe first. Lifecycle, revision, and site context may also be required.', '/vibes')),
  context('/auth/success', 'Authentication success', 'Account and business', 'public', 'Authentication return screen; begin with Sign in.', '/login'),
  context('/auth/auth-error', 'Authentication error', 'Account and business', 'public', 'Authentication recovery screen; begin with Sign in.', '/login'),
  { path: '/admin/branding', label: 'Branding (legacy redirect)', group: 'Operations', access: 'operator', kind: 'redirect', href: '/admin/launch-kit', note: 'Redirects to Launch Kit; no separate branding console.' },
  { path: '/llms.txt', label: 'LLM site guide', group: 'Machine-readable resources', access: 'public', kind: 'resource', href: '/llms.txt', note: 'Text response, not a UI page.' },
  { path: '/tah/index.json', label: 'TAH index JSON', group: 'Machine-readable resources', access: 'public', kind: 'resource', href: '/tah/index.json', note: 'JSON resource, not a UI page.' },
  { path: '/tah/headless', label: 'TAH headless library', group: 'Machine-readable resources', access: 'public', kind: 'resource', href: '/tah/headless', note: 'Headless library response.' },
  { path: '/tah/[slug]/headless', label: 'TAH headless cartridge', group: 'Machine-readable resources', access: 'public', kind: 'resource', href: '/tah', note: 'Choose a real cartridge slug before requesting its headless response.' },
  { path: '/auth/callback', label: 'Authentication callback', group: 'Account and business', access: 'public', kind: 'resource', note: 'Authentication handler; requires the actual provider callback parameters.' },
];

export function searchAppRoutes(query: string): AppRoute[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return appRoutes.filter((route) => {
    const text = `${route.path} ${route.label} ${route.group} ${route.note} ${routeAccessLabels[route.access]}`.toLowerCase();
    return words.every((word) => text.includes(word));
  });
}

export function routeDescription(route: AppRoute): string {
  return `${route.path} · ${routeAccessLabels[route.access]}${route.note ? ` · ${route.note}` : ''}`;
}
