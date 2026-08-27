import type { DeploymentEnvironment, DomainKind, NormalizedHostname } from './contracts';
import { normalizeHost } from './normalizeHost';

export type DeploymentEnvironmentResult =
  | Readonly<{ ok: true; environment: DeploymentEnvironment }>
  | Readonly<{ ok: false; auditReason: string }>;

export type TenantHostClassification =
  | Readonly<{
      ok: true;
      hostname: NormalizedHostname;
      kind: DomainKind;
      tenantCandidate: true;
      tenantSlug: string | null;
    }>
  | Readonly<{
      ok: true;
      hostname: NormalizedHostname;
      kind: 'reserved' | 'preview_global';
      tenantCandidate: false;
      tenantSlug: null;
    }>
  | Readonly<{
      ok: false;
      code: 'ENVIRONMENT_MISMATCH' | 'CONFIGURATION_ERROR';
      auditReason: string;
    }>;

const DEFAULT_ROOT_DOMAIN = 'sunsetpulse.app';
const DEFAULT_PREVIEW_ROOT = 'vercel.app';
const TENANT_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

const RESERVED_PLATFORM_SUBDOMAINS = new Set([
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
  'jamie',
  'login',
  'mail',
  'premium',
  'register',
  'static',
  'status',
  'support',
  'www',
]);

export function resolveDeploymentEnvironment(input: {
  vercelEnvironment?: string | null;
  nodeEnvironment?: string | null;
}): DeploymentEnvironmentResult {
  const vercelEnvironment = input.vercelEnvironment?.toLowerCase();
  if (vercelEnvironment) {
    if (
      vercelEnvironment === 'production' ||
      vercelEnvironment === 'preview' ||
      vercelEnvironment === 'development'
    ) {
      return { ok: true, environment: vercelEnvironment };
    }

    return { ok: false, auditReason: `Unsupported Vercel environment: ${vercelEnvironment}` };
  }

  const nodeEnvironment = input.nodeEnvironment?.toLowerCase();
  if (nodeEnvironment === 'production') return { ok: true, environment: 'production' };
  if (nodeEnvironment === 'development' || nodeEnvironment === 'test') {
    return { ok: true, environment: 'development' };
  }

  return { ok: false, auditReason: 'Deployment environment was missing or unsupported.' };
}

export function classifyTenantHostname(input: {
  hostname: NormalizedHostname;
  environment: DeploymentEnvironment;
  rootDomains?: readonly string[];
  previewRootDomains?: readonly string[];
}): TenantHostClassification {
  const rootDomains = normalizeConfiguredDomains(input.rootDomains || [DEFAULT_ROOT_DOMAIN]);
  const previewRootDomains = normalizeConfiguredDomains(
    input.previewRootDomains || [DEFAULT_PREVIEW_ROOT]
  );

  if (!rootDomains || !previewRootDomains) {
    return {
      ok: false,
      code: 'CONFIGURATION_ERROR',
      auditReason: 'A configured platform root domain was invalid.',
    };
  }

  const hostname = input.hostname;
  if (hostname === 'localhost' || !hostname.includes('.') || isIpv4(hostname)) {
    return reserved(hostname);
  }

  if (hostname.endsWith('.localhost')) {
    if (input.environment !== 'development') {
      return {
        ok: false,
        code: 'ENVIRONMENT_MISMATCH',
        auditReason: 'A local tenant hostname was used outside development.',
      };
    }

    const slug = hostname.slice(0, -'.localhost'.length);
    if (!isTenantSlug(slug)) return reserved(hostname);
    return tenant(hostname, 'local_subdomain', slug);
  }

  if (previewRootDomains.some((root) => hostname === root || hostname.endsWith(`.${root}`))) {
    return {
      ok: true,
      hostname,
      kind: 'preview_global',
      tenantCandidate: false,
      tenantSlug: null,
    };
  }

  for (const root of rootDomains) {
    if (hostname === root || hostname === `www.${root}`) return reserved(hostname);
    if (!hostname.endsWith(`.${root}`)) continue;

    const subdomain = hostname.slice(0, -(root.length + 1));
    if (!subdomain.includes('.')) {
      if (RESERVED_PLATFORM_SUBDOMAINS.has(subdomain)) return reserved(hostname);
      if (isTenantSlug(subdomain)) {
        return tenant(hostname, 'platform_subdomain', subdomain);
      }
    }

    return tenant(hostname, 'custom_domain', null);
  }

  return tenant(hostname, 'custom_domain', null);
}

function normalizeConfiguredDomains(values: readonly string[]): NormalizedHostname[] | null {
  const normalized: NormalizedHostname[] = [];
  for (const value of values) {
    const result = normalizeHost(value);
    if (!result.ok || result.value.port !== null) return null;
    normalized.push(result.value.hostname);
  }
  return normalized;
}

function isTenantSlug(value: string) {
  return TENANT_SLUG_PATTERN.test(value) && !RESERVED_PLATFORM_SUBDOMAINS.has(value);
}

function isIpv4(hostname: string) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
}

function tenant(
  hostname: NormalizedHostname,
  kind: DomainKind,
  tenantSlug: string | null
): TenantHostClassification {
  return { ok: true, hostname, kind, tenantCandidate: true, tenantSlug };
}

function reserved(hostname: NormalizedHostname): TenantHostClassification {
  return {
    ok: true,
    hostname,
    kind: 'reserved',
    tenantCandidate: false,
    tenantSlug: null,
  };
}
