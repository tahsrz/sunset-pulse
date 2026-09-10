import { resolveDeploymentEnvironment } from './environment';
import { createTenantContextResolver } from './resolveTenantContext';
import { createSupabaseTenantDomainRegistry } from './supabaseTenantDomainRegistry';

export function createPublicTenantContextResolver() {
  const environment = resolveDeploymentEnvironment({
    vercelEnvironment: process.env.VERCEL_ENV,
    nodeEnvironment: process.env.NODE_ENV,
  });
  if (!environment.ok) throw new Error(`TENANT_ENVIRONMENT_UNAVAILABLE:${environment.auditReason}`);
  return createTenantContextResolver({
    registry: createSupabaseTenantDomainRegistry(),
    environment: environment.environment,
    rootDomains: configuredDomains(process.env.NEXT_PUBLIC_ROOT_DOMAIN, process.env.ROOT_DOMAIN, 'sunsetpulse.app'),
    previewRootDomains: configuredDomains('vercel.app'),
  });
}

function configuredDomains(...values: Array<string | undefined>) {
  const domains = values.map(normalizeConfiguredDomain).filter((value): value is string => Boolean(value));
  return domains.length > 0 ? domains : undefined;
}

function normalizeConfiguredDomain(value?: string) {
  if (!value) return null;
  try {
    return new URL(value.includes('://') ? value : `https://${value}`).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}
