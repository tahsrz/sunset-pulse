import { FALLBACK_AGENT_ID, normalizeAgentId } from '@/lib/sites/agentConfig';

const DEFAULT_ROOT_DOMAIN = 'sunsetpulse.app';
const TENANT_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function getPublicAgentSiteUrl(input: {
  agentId?: string | null;
  subdomain?: string | null;
  customDomain?: string | null;
  rootDomain?: string | null;
}) {
  if (input.customDomain) {
    return `https://${normalizeHostname(input.customDomain)}`;
  }

  const rootDomain = normalizeRootDomain(input.rootDomain || process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.ROOT_DOMAIN);
  const subdomain = getAgentSiteSubdomain(input.agentId, input.subdomain);
  return `https://${subdomain}.${rootDomain}`;
}

export function getPublicRootOrigin(input: {
  requestHost?: string | null;
  protocol?: string | null;
  rootDomain?: string | null;
} = {}) {
  const local = getLocalRequestOrigin(input.requestHost, input.protocol);
  if (local) return local.rootOrigin;

  return `https://${normalizeRootDomain(input.rootDomain || process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.ROOT_DOMAIN)}`;
}

export function getPublicSubdomainOrigin(
  subdomain: string,
  input: {
    requestHost?: string | null;
    protocol?: string | null;
    rootDomain?: string | null;
  } = {},
) {
  const normalizedSubdomain = normalizeTenantSlug(subdomain);
  if (!normalizedSubdomain) throw new Error('A valid public subdomain is required.');

  const local = getLocalRequestOrigin(input.requestHost, input.protocol);
  if (local) return `${local.protocol}//${normalizedSubdomain}.localhost${local.port}`;

  return `https://${normalizedSubdomain}.${normalizeRootDomain(input.rootDomain || process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.ROOT_DOMAIN)}`;
}

export function getJamieGuideUrl(input: {
  listingId?: string | null;
  site?: string | null;
  requestHost?: string | null;
  protocol?: string | null;
}) {
  const url = new URL(getPublicSubdomainOrigin('jamie', input));
  if (input.listingId) url.searchParams.set('listing', input.listingId);
  if (input.site) url.searchParams.set('site', input.site);
  return url.toString();
}

export function getAgentSiteSubdomain(agentId?: string | null, configuredSubdomain?: string | null) {
  const subdomain = normalizeTenantSlug(configuredSubdomain);
  if (subdomain) return subdomain;

  const normalizedAgentId = normalizeAgentId(agentId) || FALLBACK_AGENT_ID;
  if (normalizedAgentId === FALLBACK_AGENT_ID) return 'taz';

  return normalizeTenantSlug(
    normalizedAgentId
      .replace(/-site$/, '')
      .replace(/-realty-\d+$/, '')
      .replace(/_/g, '-'),
  ) || normalizedAgentId.replace(/_/g, '-');
}

export function normalizeRootDomain(value?: string | null) {
  const hostname = normalizeHostname(value || DEFAULT_ROOT_DOMAIN).replace(/^www\./, '');
  if (!hostname || hostname === 'vercel.app') return DEFAULT_ROOT_DOMAIN;
  return hostname;
}

export function normalizeTenantSlug(value?: string | null) {
  const slug = value?.trim().toLowerCase();
  if (!slug || !TENANT_SLUG_PATTERN.test(slug)) return null;
  return slug;
}

function normalizeHostname(value?: string | null) {
  const withoutProtocol = (value || '').trim().replace(/^https?:\/\//i, '').split('/')[0].toLowerCase();
  if (!withoutProtocol) return '';
  return withoutProtocol.split(':')[0];
}

function getLocalRequestOrigin(requestHost?: string | null, requestedProtocol?: string | null) {
  const rawHost = (requestHost || '').trim().split(',')[0].replace(/^https?:\/\//i, '').split('/')[0];
  const hostname = rawHost.split(':')[0].toLowerCase();
  if (hostname !== 'localhost' && !hostname.endsWith('.localhost')) return null;

  const portMatch = rawHost.match(/:(\d+)$/);
  const port = portMatch ? `:${portMatch[1]}` : '';
  const protocol = requestedProtocol?.split(',')[0].trim() === 'https' ? 'https:' : 'http:';
  return { port, protocol, rootOrigin: `${protocol}//localhost${port}` };
}
