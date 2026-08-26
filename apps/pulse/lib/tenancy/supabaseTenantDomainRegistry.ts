import { supabaseAdmin } from '@/lib/supabase';
import type {
  DeploymentEnvironment,
  DomainKind,
  DomainStatus,
  NormalizedHostname,
  TenantPublication,
} from './contracts';
import type { TenantDomainQuery, TenantDomainRecord, TenantDomainRegistry } from './domainRegistry';
import { TenantDomainRegistryError } from './domainRegistry';

type TenantDomainRow = {
  id?: unknown;
  site_config_id?: unknown;
  hostname?: unknown;
  environment?: unknown;
  kind?: unknown;
  status?: unknown;
  revision?: unknown;
  verified_at?: unknown;
  site_config?: TenantSiteConfigRow | TenantSiteConfigRow[] | null;
};

type TenantSiteConfigRow = {
  id?: unknown;
  agent_id?: unknown;
  subdomain?: unknown;
  owner_id?: unknown;
  status?: unknown;
  review_profile?: { status?: unknown } | null;
  billing_profile?: { billingStatus?: unknown; trialEndsAt?: unknown } | null;
  publication_revision?: unknown;
};

const ENVIRONMENTS = new Set<DeploymentEnvironment>(['production', 'preview', 'development']);
const DOMAIN_KINDS = new Set<DomainKind>(['platform_subdomain', 'custom_domain', 'local_subdomain']);
const DOMAIN_STATUSES = new Set<DomainStatus>([
  'pending_verification',
  'pending_propagation',
  'active',
  'suspended',
  'revoked',
]);

/**
 * Server-only registry adapter for the additive tenant_domains migration.
 * It is intentionally not wired into public routes until the migration and RLS
 * rehearsal prove the relation and publication fields are available.
 */
export function createSupabaseTenantDomainRegistry(): TenantDomainRegistry {
  return Object.freeze({
    async findExact(query: TenantDomainQuery): Promise<TenantDomainRecord | null> {
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new TenantDomainRegistryError(
          'DEPENDENCY_UNAVAILABLE',
          'The service-only tenant registry is not configured.'
        );
      }

      const { data, error } = await supabaseAdmin
        .from('tenant_domains')
        .select(`
          id,
          site_config_id,
          hostname,
          environment,
          kind,
          status,
          revision,
          verified_at,
          site_config (
            id,
            agent_id,
            subdomain,
            owner_id,
            status,
            review_profile,
            billing_profile,
            publication_revision
          )
        `)
        .eq('environment', query.environment)
        .eq('hostname', query.hostname)
        .maybeSingle();

      if (error) {
        throw new TenantDomainRegistryError('DEPENDENCY_UNAVAILABLE', error.message);
      }
      if (!data) return null;

      return mapTenantDomainRow(data as TenantDomainRow, query);
    },
  });
}

export function mapTenantDomainRow(
  row: TenantDomainRow,
  query: TenantDomainQuery
): TenantDomainRecord {
  const siteConfig = Array.isArray(row.site_config) ? row.site_config[0] : row.site_config;
  const domainId = requiredString(row.id, 'domain id');
  const tenantId = requiredString(row.site_config_id, 'site config id');
  const hostname = requiredString(row.hostname, 'hostname') as NormalizedHostname;
  const environment = enumValue(row.environment, ENVIRONMENTS, 'environment');
  const kind = enumValue(row.kind, DOMAIN_KINDS, 'domain kind');
  const status = enumValue(row.status, DOMAIN_STATUSES, 'domain status');
  const revision = positiveInteger(row.revision, 'domain revision');

  if (
    hostname !== query.hostname ||
    environment !== query.environment ||
    !siteConfig ||
    String(siteConfig.id) !== tenantId
  ) {
    throw new TenantDomainRegistryError(
      'AMBIGUOUS_DOMAIN',
      'The tenant domain relation did not match the exact registry query.'
    );
  }

  const agentId = requiredString(siteConfig.agent_id, 'agent id');
  const publicationRevision = positiveInteger(
    siteConfig.publication_revision ?? row.revision,
    'publication revision'
  );
  const billingProfile = siteConfig.billing_profile || {};
  const billingState = billingStateFor(billingProfile.billingStatus);
  const trialEndsAt = nullableIsoString(billingProfile.trialEndsAt);
  const reviewStatus = reviewStatusFor(siteConfig.review_profile?.status);
  const siteStatus = siteStatusFor(siteConfig.status);
  const mayRenderPublicly =
    siteStatus === 'active' &&
    (reviewStatus === 'approved' || siteConfig.review_profile?.status == null) &&
    (billingState === 'active' || billingState === 'trialing' || billingState === 'grace');

  const publication: TenantPublication = Object.freeze({
    status: siteStatus,
    reviewStatus,
    billingState,
    mayRenderPublicly,
    reason: mayRenderPublicly ? 'ready' : 'site_config_policy_blocked',
    effectiveUntil: billingState === 'trialing' ? trialEndsAt : null,
    revision: publicationRevision,
  });

  return Object.freeze({
    domain: Object.freeze({
      domainId,
      hostname,
      environment,
      kind,
      status,
      tenantId,
      revision,
      verifiedAt: nullableIsoString(row.verified_at),
    }),
    identity: Object.freeze({
      tenantId,
      siteConfigId: tenantId,
      agentId,
      slug: requiredString(siteConfig.subdomain, 'site slug'),
      ownerId: nullableString(siteConfig.owner_id),
    }),
    publication,
  });
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TenantDomainRegistryError('AMBIGUOUS_DOMAIN', `The tenant ${field} was missing.`);
  }
  return value.trim();
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function nullableIsoString(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    throw new TenantDomainRegistryError('AMBIGUOUS_DOMAIN', 'The tenant registry contained an invalid timestamp.');
  }
  return new Date(value).toISOString();
}

function positiveInteger(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new TenantDomainRegistryError('AMBIGUOUS_DOMAIN', `The tenant ${field} was invalid.`);
  }
  return Number(value);
}

function enumValue<T extends string>(value: unknown, allowed: Set<T>, field: string): T {
  if (typeof value !== 'string' || !allowed.has(value as T)) {
    throw new TenantDomainRegistryError('AMBIGUOUS_DOMAIN', `The tenant ${field} was invalid.`);
  }
  return value as T;
}

function billingStateFor(value: unknown): TenantPublication['billingState'] {
  if (value === 'active' || value === 'trialing' || value === 'grace' || value === 'suspended' || value === 'unlinked') {
    return value;
  }
  return 'unlinked';
}

function reviewStatusFor(value: unknown): TenantPublication['reviewStatus'] {
  if (value === 'pending' || value === 'approved' || value === 'rejected') return value;
  return 'not_requested';
}

function siteStatusFor(value: unknown): TenantPublication['status'] {
  if (value === 'active' || value === 'draft' || value === 'suspended') return value;
  return 'draft';
}
