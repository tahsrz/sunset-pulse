# Implementation Blueprint

## Proposed module layout

```text
apps/pulse/lib/tenancy/
  contracts.ts
  domainNormalization.ts
  domainRegistry.ts
  tenantContext.ts
  tenantContextCache.ts
  tenantPublication.ts
  tenantAccess.ts
  errors.ts

apps/pulse/lib/public-inventory/
  contracts.ts
  publicProjection.ts
  visibilityPolicy.ts
  service.ts
  canonicalAdapter.ts
  legacyAdapter.ts
  assignmentStore.ts

apps/pulse/lib/domain-projection/
  contracts.ts
  outboxStore.ts
  edgeManifest.ts
  projectionWorker.ts
  reconciliation.ts
```

All modules are server-only except pure contracts and normalization helpers that contain no secrets or database access.

## TenantContext implementation order

### Step 1: Pure hostname normalization

Extract the current routing normalization into one pure module.

```ts
normalizeRequestHostname(input: string): Result<NormalizedHostname, HostError>
classifyPlatformHostname(hostname, environmentConfig): PlatformHostResult
```

Requirements:

- case normalization
- port removal
- trailing-dot policy
- reserved-name rejection
- environment root matching
- explicit localhost handling
- no comma-chain trust unless proxy mode owns parsing

### Step 2: Domain registry adapter

```ts
interface DomainRegistry {
  findExact(input: {
    hostname: string;
    environment: DeploymentEnvironment;
  }): Promise<ResolvedDomain | null>;
}
```

Implement Supabase first. Edge manifest is an optional candidate adapter, never the final authority.

### Step 3: Publication resolver

Move the readiness, billing, review, and status logic currently embedded in `siteData.ts` into a pure policy function plus an authoritative loader.

```ts
evaluateTenantPublication(input: PublicationInputs): TenantPublication
```

Test every billing/review/status combination as a table.

### Step 4: Request resolver

```ts
resolveTenantContext(request: Request): Promise<TenantResolutionResult>
requireTenantContext(request: Request): Promise<TenantContext>
```

Resolve once, cache the promise by request, and pass context explicitly.

### Step 5: Migrate page boundary

- middleware remains a fast route optimizer and header sanitizer
- tenant page resolves context from host
- rewritten slug must equal context slug
- metadata uses the same context and inventory service

### Step 6: Migrate APIs

First APIs:

- featured
- hot-list
- public lead ingestion
- Jamie guide context/events
- recon

Delete raw `x-sunset-tenant` reads from these routes.

## Public inventory implementation order

### Step 1: Projection schema

Create Zod `publicListingSchema`. Add a test asserting owner and arbitrary metadata are stripped even if present in the source.

### Step 2: Visibility policy

```ts
evaluatePublicVisibility({ listing, tenantAssignment, purpose }): VisibilityDecision
```

Decision includes a private reason code for telemetry and a generic public result.

### Step 3: Source adapters

Canonical adapter reads Supabase public-eligible rows. Legacy adapter applies the same policy and returns normalized internal data, never raw Mongo documents.

### Step 4: Service

Service applies source precedence, tenant assignment, purpose rules, and projection.

### Step 5: Route migration

Replace public route imports one group at a time. Add a static boundary test preventing direct `Property` imports in anonymous routes.

### Step 6: Assignment migration

Backfill many-to-many assignments from hot-list MLS IDs. Keep compatibility reads behind a flag until discrepancy checks reach zero.

## Domain projection implementation order

1. Add schema and claim function.
2. Implement manifest serialization as a deterministic pure function.
3. Implement remote writer behind `DOMAIN_EDGE_PROJECTION_ENABLED`.
4. Add revision supersession.
5. Add reconciliation digest.
6. Add Atlas operator status.
7. Enable preview only.

## Resolver pseudocode

```ts
async function resolveTenantContextUncached(request: Request) {
  const hostname = requireNormalizedHost(request);
  const environment = getDeploymentEnvironment();

  const candidate = await resolveDomainCandidate({ hostname, environment });
  if (!candidate) return rejected('UNKNOWN_DOMAIN');

  const domain = await authoritativeDomainRegistry.findExact({ hostname, environment });
  if (!domain || domain.status !== 'active') return rejected('DOMAIN_NOT_ACTIVE');

  if (candidate.tenantId !== domain.tenantId || candidate.revision > domain.revision) {
    return rejected('DOMAIN_PROJECTION_MISMATCH');
  }

  const identity = await loadTenantIdentity(domain);
  const publication = await resolveTenantPublication(identity);
  if (!publication.mayRenderPublicly) return rejected('SITE_NOT_PUBLISHED');

  return accepted(freezeContext({ domain, identity, publication }));
}
```

For deterministic platform subdomains, candidate resolution does not require Edge Config. The authoritative registry still verifies the site before rendering.

## Error mapping

Public routes:

- unknown/inactive/wrong tenant/private listing: 404
- dependency outage: 503
- malformed user filters: 400
- rate limit: 429

Authenticated admin routes:

- unauthenticated: 401/403 according to existing response convention
- wrong tenant capability: 403
- stale revision: 409
- missing target: 404

Do not expose whether another tenant owns a requested resource.

## Cache implementation

- Request promise cache: `WeakMap<Request, Promise<Result>>`
- Domain cache: environment + exact hostname, short TTL, negative TTL shorter
- Rich context: tenant ID + domain revision + publication revision
- Inventory: listing ID + tenant ID/global + assignment revision + purpose

Mutation invalidation is mandatory before mutation response claims propagation complete.

## Tests created alongside implementation

```text
tests/unit/tenant-host-normalization.test.ts
tests/unit/tenant-context-policy.test.ts
tests/unit/tenant-context-route.test.ts
tests/unit/public-listing-projection.test.ts
tests/unit/public-inventory-policy.test.ts
tests/unit/public-inventory-routes.test.ts
tests/unit/domain-projection-outbox.test.ts
tests/unit/domain-projection-reconciliation.test.ts
tests/tenant-isolation.spec.ts
```

## Code-review invariants

- No business service accepts both `tenantId` and `TenantContext`; use context.
- No public route imports raw Mongo property models.
- No route trusts body/query agent IDs.
- No edge projection value grants authorization.
- No catch block converts an authorization lookup error into a default tenant.
- No external side effect occurs before its durable intent exists.

