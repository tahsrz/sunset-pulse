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
