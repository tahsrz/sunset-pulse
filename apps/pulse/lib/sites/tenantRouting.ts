const DEFAULT_ROOT_DOMAIN = 'sunsetpulse.app';

const FIRST_PARTY_SUBDOMAINS = new Set(['jamie']);

const RESERVED_SUBDOMAINS = new Set([
  'admin',
  'api',
  'app',
  'assets',
  'auth',
  'blog',
  'cdn',
  'checkout',
  'dashboard',
  'docs',
  'login',
  'mail',
  'jamie',
  'premium',
  'register',
  'static',
  'status',
  'support',
  'www',
]);

const TENANT_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const PUBLIC_FILE_PATTERN = /\.(?:avif|css|gif|ico|jpeg|jpg|js|json|map|png|svg|txt|webp|woff|woff2)$/i;

const TENANT_REWRITE_BYPASS_PREFIXES = [
  '/_next',
  '/_sites',
  '/api',
  '/auth',
  '/cart',
  '/checkout',
  '/dashboard',
  '/login',
  '/profile',
  '/premium',
  '/register',
  '/sites',
  '/studio',
];

export type TenantRewrite = {
  tenant: string;
  hostname: string;
  kind: 'first-party' | 'tenant';
  url: URL;
};

export function getTenantRewrite(request: {
  headers: Headers;
  nextUrl?: URL;
  url: string;
}): TenantRewrite | null {
  const hostname = getRequestHostname(request);
  const firstPartySite = getFirstPartySiteFromHost(hostname);
  const tenant = firstPartySite || getTenantFromHost(hostname);

  if (!tenant || shouldBypassTenantRewrite(request.nextUrl?.pathname || new URL(request.url).pathname)) {
    return null;
  }

  const url = request.nextUrl ? new URL(request.nextUrl) : new URL(request.url);
  const pathname = url.pathname === '/' ? '' : url.pathname;
  url.pathname = `/sites/${tenant}${pathname}`;

  return {
    tenant,
    hostname,
    kind: firstPartySite ? 'first-party' : 'tenant',
    url,
  };
}

export function getFirstPartySiteFromHost(host: string | null | undefined): 'jamie' | null {
  const subdomain = getSubdomainFromHost(normalizeHostname(host));
  return subdomain && FIRST_PARTY_SUBDOMAINS.has(subdomain) ? 'jamie' : null;
}

export function getTenantFromHost(host: string | null | undefined): string | null {
  const hostname = normalizeHostname(host);
  const subdomain = getSubdomainFromHost(hostname);
  return subdomain ? normalizeTenantSlug(subdomain) : null;
}

export function normalizeHostname(host: string | null | undefined): string {
  if (!host) return '';

  const withoutProtocol = host.trim().split(',')[0].replace(/^https?:\/\//i, '').split('/')[0].toLowerCase();
  if (!withoutProtocol) return '';

  if (withoutProtocol.startsWith('[')) {
    const closeIndex = withoutProtocol.indexOf(']');
    return closeIndex === -1 ? withoutProtocol : withoutProtocol.slice(1, closeIndex);
  }

  const colonCount = (withoutProtocol.match(/:/g) || []).length;
  if (colonCount > 1) return withoutProtocol;

  return withoutProtocol.split(':')[0];
}

function getRequestHostname(request: { headers: Headers; nextUrl?: URL }): string {
  return normalizeHostname(
    request.headers.get('x-forwarded-host') ||
      request.headers.get('host') ||
      request.nextUrl?.hostname ||
      ''
  );
}

function getRootDomains(): string[] {
  const configuredDomains = [
    process.env.NEXT_PUBLIC_ROOT_DOMAIN,
    process.env.ROOT_DOMAIN,
    process.env.NEXT_PUBLIC_DOMAIN,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    DEFAULT_ROOT_DOMAIN,
  ];

  return Array.from(
    new Set(
      configuredDomains
        .map((domain) => normalizeHostname(domain))
        .filter(Boolean)
        .map((domain) => domain.replace(/^www\./, ''))
        .filter((domain) => domain !== 'vercel.app')
    )
  );
}

function getSubdomainFromHost(hostname: string): string | null {
  if (!hostname || isLoopbackHost(hostname)) return null;

  if (hostname.endsWith('.localhost')) {
    const subdomain = hostname.slice(0, -'.localhost'.length);
    return subdomain && !subdomain.includes('.') ? subdomain : null;
  }

  for (const rootDomain of getRootDomains()) {
    if (hostname === rootDomain || hostname === `www.${rootDomain}`) continue;
    if (!hostname.endsWith(`.${rootDomain}`)) continue;

    const subdomain = hostname.slice(0, -(rootDomain.length + 1));
    return subdomain && !subdomain.includes('.') ? subdomain : null;
  }

  return null;
}

function normalizeTenantSlug(value: string): string | null {
  const tenant = value.toLowerCase();

  if (RESERVED_SUBDOMAINS.has(tenant) || !TENANT_SLUG_PATTERN.test(tenant)) {
    return null;
  }

  return tenant;
}

function shouldBypassTenantRewrite(pathname: string): boolean {
  if (PUBLIC_FILE_PATTERN.test(pathname)) return true;

  return TENANT_REWRITE_BYPASS_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}
