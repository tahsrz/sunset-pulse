import type {
  DeploymentEnvironment,
  DomainKind,
  TenantContext,
  TenantContextResolver,
  TenantIdentity,
  TenantPublication,
  TenantResolutionResult,
} from './contracts';
import type {
  TenantDomainCandidateProvider,
  TenantDomainProjectionCandidate,
  TenantDomainQuery,
  TenantDomainRecord,
  TenantDomainRegistry,
} from './domainRegistry';
import { TenantDomainRegistryError } from './domainRegistry';
import { classifyTenantHostname } from './environment';
import { createTenantResolutionError, TenantContextRequiredError } from './errors';
import { normalizeHost } from './normalizeHost';
import { createRequestPromiseCache } from './requestCache';

export type TenantContextResolverOptions = Readonly<{
  registry: TenantDomainRegistry;
  environment: DeploymentEnvironment;
  candidateProvider?: TenantDomainCandidateProvider;
  rootDomains?: readonly string[];
  previewRootDomains?: readonly string[];
  trustForwardedHost?: boolean;
  createRequestId?: () => string;
  now?: () => Date;
}>;

const PUBLIC_BILLING_STATES = new Set<TenantPublication['billingState']>([
  'active',
  'trialing',
  'grace',
]);

export function createTenantContextResolver(
  options: TenantContextResolverOptions
): TenantContextResolver {
  const cache = createRequestPromiseCache<TenantResolutionResult>();

  const resolve = (request: Request) => cache.getOrCreate(
    request,
    () => resolveTenantContextUncached(request, options)
  );

  return Object.freeze({
    resolve,
    async require(request: Request) {
      const result = await resolve(request);
      if (!result.ok) throw new TenantContextRequiredError(result.error);
      return result.context;
    },
  });
}

async function resolveTenantContextUncached(
  request: Request,
  options: TenantContextResolverOptions
): Promise<TenantResolutionResult> {
  const observedHost = readObservedHost(request, options.trustForwardedHost === true);
  const normalized = normalizeHost(observedHost);

  if (!normalized.ok) {
    const code = normalized.error.code === 'MISSING_HOST' ? 'NO_TENANT_HOST' : 'MALFORMED_HOST';
    return rejected(code, normalized.error.auditReason);
  }

  const classification = classifyTenantHostname({
    hostname: normalized.value.hostname,
    environment: options.environment,
    rootDomains: options.rootDomains,
    previewRootDomains: options.previewRootDomains,
  });

  if (!classification.ok) {
    const code = classification.code === 'ENVIRONMENT_MISMATCH'
      ? 'ENVIRONMENT_MISMATCH'
      : 'CONFIGURATION_ERROR';
    return rejected(code, classification.auditReason);
  }

  if (!classification.tenantCandidate) {
    return rejected('RESERVED_HOST', 'The observed host does not address a tenant site.');
  }

  const query: TenantDomainQuery = Object.freeze({
    environment: options.environment,
    hostname: normalized.value.hostname,
  });

  const candidate = await readProjectionCandidate(query, options.candidateProvider);
  let record: TenantDomainRecord | null;

  try {
    record = await options.registry.findExact(query);
  } catch (error) {
    if (error instanceof TenantDomainRegistryError) {
      return rejected(error.code, error.message);
    }
    return rejected('DEPENDENCY_UNAVAILABLE', 'The authoritative tenant registry was unavailable.');
  }

  if (!record) {
    return rejected('UNKNOWN_DOMAIN', 'No authoritative domain record matched the observed host.');
  }

  const now = options.now?.() || new Date();
  if (!Number.isFinite(now.getTime())) {
    return rejected('CONFIGURATION_ERROR', 'The tenant resolver clock returned an invalid time.');
  }

  const authoritativeFailure = validateAuthoritativeRecord({
    record,
    query,
    expectedKind: classification.kind,
    expectedSlug: classification.tenantSlug,
    candidate,
    now,
  });
  if (authoritativeFailure) return authoritativeFailure;

  const identity = record.identity as TenantIdentity;
  const publication = record.publication as TenantPublication;
  const context: TenantContext = Object.freeze({
    requestId: options.createRequestId?.() || globalThis.crypto.randomUUID(),
    domain: Object.freeze({ ...record.domain }),
    identity: Object.freeze({ ...identity }),
    publication: Object.freeze({ ...publication }),
    source: sourceForKind(classification.kind),
    resolvedAt: now.toISOString(),
  });

  return Object.freeze({ ok: true, context });
}

function validateAuthoritativeRecord(input: {
  record: TenantDomainRecord;
  query: TenantDomainQuery;
  expectedKind: DomainKind;
  expectedSlug: string | null;
  candidate: TenantDomainProjectionCandidate | null;
  now: Date;
}): TenantResolutionResult | null {
  const { domain, identity, publication } = input.record;

  if (!isPositiveInteger(domain.revision)) {
    return rejected('CONFIGURATION_ERROR', 'The authoritative domain revision was invalid.');
  }

  if (
    domain.hostname !== input.query.hostname ||
    domain.environment !== input.query.environment ||
    domain.kind !== input.expectedKind
  ) {
    return rejected(
      'AUTHORITATIVE_MISMATCH',
      'The registry record did not match the exact host, environment, and domain kind.'
    );
  }

  if (domain.status !== 'active') {
    return rejected('DOMAIN_NOT_ACTIVE', 'The authoritative domain record was not active.');
  }

  if (
    domain.kind === 'custom_domain' &&
    (!domain.verifiedAt || !Number.isFinite(Date.parse(domain.verifiedAt)))
  ) {
    return rejected('DOMAIN_NOT_ACTIVE', 'The active custom domain lacked valid verification evidence.');
  }

  if (!identity || !publication) {
    return rejected('TENANT_NOT_FOUND', 'The domain did not resolve to a complete tenant site record.');
  }

  if (
    domain.tenantId !== identity.tenantId ||
    identity.tenantId !== identity.siteConfigId ||
    !identity.tenantId ||
    !identity.agentId ||
    !identity.slug ||
    (input.expectedSlug !== null && identity.slug !== input.expectedSlug)
  ) {
    return rejected(
      'AUTHORITATIVE_MISMATCH',
      'The domain and authoritative tenant identity did not agree.'
    );
  }

  const candidateFailure = validateProjectionCandidate(input.candidate, input.query, domain);
  if (candidateFailure) return candidateFailure;

  if (!isPositiveInteger(publication.revision)) {
    return rejected('CONFIGURATION_ERROR', 'The tenant publication revision was invalid.');
  }

  if (!PUBLIC_BILLING_STATES.has(publication.billingState)) {
    return rejected('ENTITLEMENT_BLOCKED', 'The tenant billing state does not permit publication.');
  }

  if (publication.effectiveUntil !== null) {
    const effectiveUntil = Date.parse(publication.effectiveUntil);
    if (!Number.isFinite(effectiveUntil) || effectiveUntil <= input.now.getTime()) {
      return rejected('ENTITLEMENT_BLOCKED', 'The tenant publication entitlement has expired.');
    }
  }

  if (
    publication.status !== 'active' ||
    publication.reviewStatus !== 'approved' ||
    !publication.mayRenderPublicly
  ) {
    return rejected('SITE_NOT_PUBLISHED', 'The tenant site is not approved for public rendering.');
  }

  return null;
}

function validateProjectionCandidate(
  candidate: TenantDomainProjectionCandidate | null,
  query: TenantDomainQuery,
  domain: TenantDomainRecord['domain']
): TenantResolutionResult | null {
  if (!candidate) return null;

  if (!isPositiveInteger(candidate.revision)) {
    return rejected('AUTHORITATIVE_MISMATCH', 'The routing projection revision was invalid.');
  }

  if (
    candidate.hostname !== query.hostname ||
    candidate.environment !== query.environment ||
    candidate.domainId !== domain.domainId ||
    candidate.tenantId !== domain.tenantId
  ) {
    return rejected(
      'AUTHORITATIVE_MISMATCH',
      'The routing projection candidate disagreed with the authoritative domain record.'
    );
  }

  if (candidate.revision < domain.revision) {
    return rejected('STALE_PROJECTION', 'The routing projection candidate was stale.');
  }

  if (candidate.revision > domain.revision) {
    return rejected(
      'AUTHORITATIVE_MISMATCH',
      'The routing projection candidate was ahead of the authoritative domain record.'
    );
  }

  return null;
}

async function readProjectionCandidate(
  query: TenantDomainQuery,
  provider?: TenantDomainCandidateProvider
) {
  if (!provider) return null;

  try {
    return await provider.findCandidate(query);
  } catch {
    // The projection is an optimization. Authoritative resolution remains database-backed.
    return null;
  }
}

function readObservedHost(request: Request, trustForwardedHost: boolean) {
  if (trustForwardedHost) {
    const forwardedHost = request.headers.get('x-forwarded-host');
    if (forwardedHost) return forwardedHost;
  }

  const host = request.headers.get('host');
  if (host) return host;

  try {
    return new URL(request.url).host;
  } catch {
    return null;
  }
}

function sourceForKind(kind: DomainKind): TenantContext['source'] {
  if (kind === 'custom_domain') return 'custom_domain';
  if (kind === 'local_subdomain') return 'local_fixture';
  return 'host';
}

function isPositiveInteger(value: number) {
  return Number.isSafeInteger(value) && value > 0;
}

function rejected(
  code: Parameters<typeof createTenantResolutionError>[0],
  auditReason: string
): TenantResolutionResult {
  return Object.freeze({
    ok: false,
    error: createTenantResolutionError(code, auditReason),
  });
}
