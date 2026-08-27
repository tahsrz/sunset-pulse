# TenantContext Contracts

## Design rule

Resolution answers "which tenant does this request address?" Authorization answers "what may this actor do inside that tenant?" Entitlement answers "which product capabilities are currently enabled?" These are separate values and separate test suites.

## Core types

```ts
export type DeploymentEnvironment = 'production' | 'preview' | 'development';

export type DomainKind =
  | 'platform_subdomain'
  | 'custom_domain'
  | 'local_subdomain';

export type DomainStatus =
  | 'pending_verification'
  | 'pending_propagation'
  | 'active'
  | 'suspended'
  | 'revoked';

export type ResolvedDomain = Readonly<{
  domainId: string;
  hostname: string;
  environment: DeploymentEnvironment;
  kind: DomainKind;
  status: DomainStatus;
  tenantId: string;
  revision: number;
  verifiedAt: string | null;
}>;

export type TenantIdentity = Readonly<{
  tenantId: string;
  agentId: string;
  siteConfigId: string;
  slug: string;
  ownerId: string | null;
}>;

export type TenantPublication = Readonly<{
  status: 'draft' | 'active' | 'suspended';
  reviewStatus: 'not_requested' | 'pending' | 'approved' | 'rejected';
  billingState: 'active' | 'trialing' | 'grace' | 'suspended' | 'unlinked';
  mayRenderPublicly: boolean;
  reason: string;
  effectiveUntil: string | null;
  revision: number;
}>;

export type TenantContext = Readonly<{
  requestId: string;
  domain: ResolvedDomain;
  identity: TenantIdentity;
  publication: TenantPublication;
  source: 'host' | 'custom_domain' | 'local_fixture' | 'internal_test';
  resolvedAt: string;
}>;
```

`TenantContext` contains no session user, role, or authorization capability. That prevents a successful hostname lookup from being confused with permission.

Phase-one `tenantId` is the string representation of the authoritative `site_config.id` UUID (ADR-017). It is not `agent_id`, a slug, or a browser-provided compatibility key.

## Authorization contract

```ts
export type TenantCapability =
  | 'site:read_public'
  | 'site:edit'
  | 'site:review'
  | 'listing:assign'
  | 'lead:read'
  | 'lead:update'
  | 'notification:manage';

export type TenantAccess = Readonly<{
  actorId: string;
  tenantId: string;
  agentId: string;
  role: 'realtor' | 'operator' | 'admin';
  capabilities: ReadonlySet<TenantCapability>;
}>;
```

The authorization resolver accepts an authenticated actor plus `TenantContext` and verifies the relationship in the authoritative store.

## Resolution API

```ts
export interface TenantContextResolver {
  resolve(request: Request): Promise<TenantResolutionResult>;
  require(request: Request): Promise<TenantContext>;
}

export type TenantResolutionResult =
  | { ok: true; context: TenantContext }
  | { ok: false; error: TenantResolutionError };

export type TenantResolutionError = Readonly<{
  code:
    | 'NO_TENANT_HOST'
    | 'MALFORMED_HOST'
    | 'RESERVED_HOST'
    | 'UNKNOWN_DOMAIN'
    | 'AMBIGUOUS_DOMAIN'
    | 'ENVIRONMENT_MISMATCH'
    | 'DOMAIN_NOT_ACTIVE'
    | 'TENANT_NOT_FOUND'
    | 'SITE_NOT_PUBLISHED'
    | 'ENTITLEMENT_BLOCKED'
    | 'DEPENDENCY_UNAVAILABLE';
  publicStatus: 404 | 503;
  publicMessage: 'Site unavailable.';
  auditReason: string;
}>;
```

Public failures intentionally collapse to a small response vocabulary. Detailed reasons belong in redacted telemetry, not the browser.

## Request-scope memoization

Resolve at the route boundary and pass context explicitly. A request-keyed promise cache is allowed only to deduplicate unavoidable repeated calls:

```ts
const byRequest = new WeakMap<Request, Promise<TenantResolutionResult>>();

export function resolveTenantContext(request: Request) {
  const existing = byRequest.get(request);
  if (existing) return existing;

  const pending = resolveTenantContextUncached(request);
  byRequest.set(request, pending);
  return pending;
}
```

Cross-request caches use `environment:hostname` for domain records and `tenantId:revision` for rich context. Never key by slug alone.

## Resolution sequence

```text
1. Read actual request hostname.
2. Normalize case, trailing dot, scheme/port artifacts, and permitted IDNA form.
3. Determine deployment environment from server configuration.
4. Recognize deterministic platform/local domain or exact custom-domain registry entry.
5. Reject unknown, duplicate, environment-mismatched, or inactive domain.
6. Load tenant identity and publication pointer.
7. Calculate publication/entitlement independently.
8. Return immutable TenantContext.
9. Business route passes context explicitly to downstream services.
```

## API route rule

API routes call `requireTenantContext(request)` directly. They do not read `x-sunset-tenant`. Middleware may sanitize and optimize page routing, but it is not the API identity transport.

## Page route rule

The rewritten route parameter is a candidate. The server component requires host-derived context and verifies that `context.identity.slug` equals the rewritten slug before loading data.

## Custom-domain rule

Custom domains must be exact active registry matches. `*.example.com` wildcard ownership is represented as individually verified hostnames unless a later product explicitly supports wildcard domain ownership with separate validation.

## Local and preview rules

- `<slug>.localhost:3000` works only outside production and must resolve to a development fixture or development-scoped database row.
- Generic Vercel preview domains resolve to the global application.
- Tenant preview uses an explicit preview root or a preview-scoped exact registry row.
- No development condition grants operator capabilities.

## Integration points

First consumers:

- Tenant site page and metadata
- `/api/properties/featured`
- `/api/properties/hot-list`
- Public lead ingestion
- Public Jamie guide context
- Recon if it remains tenant-aware

Later consumers:

- Agent admin routes through `TenantAccess`
- Alert enrichment
- Notification routing
- Listing assignment operations
