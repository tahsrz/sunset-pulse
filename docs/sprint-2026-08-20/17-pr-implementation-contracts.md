# Pull Request Implementation Contracts

These contracts define the future TenantContext/public-inventory PR series. They do not replace the current dirty-branch decomposition in document 07. First preserve and split existing work; then build these PRs from a current mainline or another explicitly agreed base.

## Series rules

- Each PR has one primary rollback decision.
- Database migrations never share a PR with unrelated UI or crawler work.
- Security tests land with or before the behavior they constrain.
- A later PR may depend on an earlier merged contract, but may not copy an alternate version of that contract.
- Commit cadence follows coherent review units, not an arbitrary daily frequency.
- Draft PRs may expose integration progress; only the listed acceptance gate permits merge.

## TC-00: Baseline and security fixtures

Purpose: establish trustworthy tests without changing production behavior.

Expected scope:

- `apps/pulse/tests/fixtures/tenantFixtures.ts`
- `apps/pulse/tests/fixtures/listingFixtures.ts`
- `apps/pulse/tests/unit/listing-read-surfaces.test.ts`
- new host and projection test skeletons
- directly related planning references

Required behavior:

- stale repository mocks reflect current safe public helper names
- fixtures model two unrelated tenants, preview, suspension, co-listing, expiration, and sensitive listing fields
- negative tests initially describe expected failures without weakening production code

Forbidden scope:

- route behavior changes
- executable schema migrations
- middleware rewrite changes
- Edge Config client
- Jamie audio or TAH work

Acceptance:

- focused listing tests pass
- fixture object graphs contain no accidental shared IDs except the explicit co-listed listing
- full unit/build baseline and known failures are attached
- worktree allocation ledger is complete

Rollback: test-only revert. No runtime flag required.

## TC-01: Host normalization and TenantContext contracts

Purpose: land the pure trust-boundary vocabulary.

Expected scope:

- `apps/pulse/lib/tenancy/contracts.ts`
- `apps/pulse/lib/tenancy/normalizeHost.ts`
- `apps/pulse/lib/tenancy/environment.ts`
- `apps/pulse/lib/tenancy/errors.ts`
- focused unit tests

Required behavior:

- exact normalized hostname representation
- explicit production/preview/development environment
- typed success/failure resolution contract
- reserved platform host classification
- rejection of schemes, paths, commas, control characters, deceptive suffixes, and unauthorized local/preview crossover

Forbidden scope:

- database queries
- authorization or entitlement decisions
- tenant selection from request payload/header
- changes to `apps/pulse/middleware.js`

Acceptance:

- table-driven and fuzz/adversarial host tests pass
- normalization is idempotent
- modules are server-safe but pure and independently testable
- public failures disclose no candidate tenant identity

Rollback: remove unused pure modules; no production effect until consumed.

## TC-02: Authoritative registry schema and resolver

Purpose: resolve exact host scope from authoritative data and expose it to server callers.

Expected scope:

- additive `tenant_domains`, projection, and outbox schema keyed to the phase-one `site_config.id` tenant scope
- `apps/pulse/lib/tenancy/domainRegistry.ts`
- `apps/pulse/lib/tenancy/resolveTenantContext.ts`
- `apps/pulse/lib/tenancy/requestCache.ts`
- fake/integration adapters and tests

Required behavior:

- exact `(environment, hostname)` lookup
- authoritative site/tenant/revision confirmation
- request-local Promise deduplication
- typed inactive/stale/configuration failures
- service-only operational table access
- deterministic conflict-reporting backfill

Forbidden scope:

- route migration beyond a private diagnostic/test surface
- public `site_config` RLS removal
- remote Edge Config writes
- global fallback from an unresolved tenant

Acceptance:

- Q01-Q11 preflight/postflight evidence clean in staging
- two concurrent resolver calls on one request make one lookup
- cross-request state is not shared
- stale projection and authoritative mismatch fail closed
- anonymous and ordinary users cannot read domain/outbox/projection tables

Rollout: schema first, resolver disabled by default, shadow diagnostics in preview only.

Rollback: disable resolver consumption; preserve additive tables for diagnosis.

## TC-03: Tenant page and API resolution

Purpose: eliminate ambient or spoofable tenant scope on selected routes.

Expected scope:

- `apps/pulse/lib/sites/tenantRouting.ts`
- selected tenant page entry points
- `apps/pulse/app/api/properties/featured/route.ts`
- `apps/pulse/app/api/properties/hot-list/route.ts`
- route tests proving host authority

Required behavior:

- API routes call the host-derived resolver directly
- browser `x-sunset-*`, tenant ID, agent ID, and forwarded-host claims cannot select scope
- unknown/suspended/wrong-environment states use uniform public 404 mapping
- trusted proxy behavior is configured and tested explicitly

Forbidden scope:

- broad middleware redesign
- listing assignment schema
- permissive fallback to global inventory
- full route fleet migration

Acceptance:

- all host-resolution tests HST-001 onward pass
- production-like preview smoke requests show the observed normalized host and result category in redacted logs
- no migrated API route reads `x-sunset-tenant`
- resolver latency is within the initial SLO

Rollout: route allow-list flag, preview first, then one production platform domain.

Rollback: remove route from allow-list; old path is permitted only if equally authoritative and not header-trusting.

## PI-01: PublicListing projection and canonical policy

Purpose: make safe public output structurally distinct from internal listings.

Expected scope:

- `apps/pulse/lib/public-inventory/contracts.ts`
- `apps/pulse/lib/public-inventory/projectPublicListing.ts`
- `apps/pulse/lib/public-inventory/visibilityPolicy.ts`
- adapters around `apps/pulse/lib/data/listingRepository.ts`
- projection and policy tests

Required behavior:

- Zod/runtime schema is the source for the TypeScript output type
- default deny for private, deleted, suppressed, demo, malformed, and licensing-disallowed records
- deliberate coordinate precision policy
- sensitive fields absent recursively
- policy returns decision reason for internal telemetry, not public enumeration

Forbidden scope:

- direct public route migration
- tenant assignment backfill
- UI redesign
- caller-selected `publicOnly` weakening

Acceptance:

- public projection snapshots are allow-list snapshots
- property-based test adding arbitrary internal fields cannot change output
- Mongo and Supabase adapters produce equivalent canonical eligibility decisions
- no arbitrary `metadata` object enters `PublicListing`

Rollback: unused projection modules can be reverted; no behavior changes until PI-02.

## PI-02: Public inventory service and route migration

Purpose: migrate anonymous inventory surfaces to one policy-owning service.

Expected scope:

- `apps/pulse/lib/public-inventory/publicInventoryService.ts`
- anonymous property routes enumerated in the security matrix
- route contract tests
- import-boundary test

Required behavior:

- routes receive only `PublicListing` or public result types
- repository owns filtering before pagination/counts
- detail, grid, search, map, value guess, location guess, and Jamie listing context converge on canonical identity
- internal Mongo models cannot be imported from anonymous route modules

Forbidden scope:

- tenant-specific publication until PI-03
- private owner/admin routes
- front-end visual redesign
- recon internals becoming public by accident

Acceptance:

- fixture matrix passes across every migrated surface
- counts/pagination do not reveal hidden rows
- response headers and cache keys include no private identifiers
- production build and targeted Jamie guide E2E pass

Rollout: migrate read-only routes in small allow-listed groups; compare result categories, not private payloads.

Rollback: per-route service flag to the previous safe public helper; never to a raw model.

## PI-03: Tenant listing assignments

Purpose: authorize tenant publication independently of global canonical eligibility.

Expected scope:

- additive `tenant_listing_assignments` migration
- assignment repository/policy
- deterministic legacy backfill report
- tenant public inventory integration

Required behavior:

- stable canonical listing key
- many-to-many tenant/listing relation
- purpose, revision, publish/expire/revoke lifecycle
- both canonical public eligibility and active tenant assignment required
- no tenant global fallback

Forbidden scope:

- deleting old JSON configuration columns
- automatic conflict resolution
- admin UX beyond minimal operational proof

Acceptance:

- Q14 integrity checks are clean
- co-listed fixture appears for A and B
- private/unassigned/expired/revoked fixtures never appear
- tenant A cannot enumerate whether tenant B assigned a listing
- assignment mutation invalidates the correct cache revision

Rollout: backfill dry run, staging write, comparison, then tenant route flag.

Rollback: disable tenant assignment consumption and tenant public route if no equally safe legacy authorization exists.

## AU-01: Public site projection and RLS tightening

Purpose: retire full-row public site access and broad cross-tenant realtor policies.

Expected scope:

- typed public site projection/server route
- direct browser Supabase call replacements
- owner/member-scoped RLS migration
- two-JWT integration tests

Required behavior:

- public site output includes only approved branding/content/contact/compliance fields
- prompts, models, operations, billing, integrations, review notes, owner IDs, and operator metadata remain private
- realtor A cannot directly select tenant B rows
- zero-row protected mutations are not reported as success

Forbidden scope:

- permissive temporary policy
- service-role client in browser code
- unrelated profile or scheduling policy redesign

Acceptance:

- Q02-Q05 and Q15-Q18 evidence attached
- browser smoke suite confirms migrated dependencies still work
- anonymous full `site_config` select is denied
- cross-tenant direct-client matrix passes with real JWT claims

Rollout: replace dependencies first, restrictive migration second, observe errors, then remove compatibility code later.

Rollback: use a narrowly reviewed owner policy/server path. Never restore full-row public or all-realtor policies.

## DP-01: Edge projection worker and reconciliation

Purpose: maintain the routing projection without making it authoritative.

Expected scope:

- `apps/pulse/lib/domain-projection/manifestSerializer.ts`
- `apps/pulse/lib/domain-projection/outboxStore.ts`
- `apps/pulse/lib/domain-projection/edgeConfigWriter.ts`
- worker/cron route
- reconciliation service and tests

Required behavior:

- deterministic manifest bytes/digest
- atomic leased claim with latest-revision supersession
- idempotent remote application
- compare desired, applied, and observed state
- repair missing/stale/extra entries
- dead-letter and manual replay controls

Forbidden scope:

- using Edge Config as tenant authority
- logging secrets or full configuration
- unbounded worker batches
- deletion of forensic state during an incident

Acceptance:

- concurrency, lease expiry, remote timeout, stale completion, and full rebuild tests pass
- Q12/Q13 converge under failure injection
- one environment cannot overwrite another
- resolver still confirms authoritative database state

Rollout: fake writer, preview writer, production dry reconciliation, production writes behind flag.

Rollback: disable worker writes and let DB resolver/404 behavior contain drift.

## OP-01: Observability, Atlas operations, and release proof

Purpose: make the new boundaries operable before general rollout.

Expected scope:

- structured event helper
- dashboard queries/API
- Atlas domain projection status panel
- alert rules/runbook links
- E2E isolation proof and preview drill evidence

Required behavior:

- resolution failures, drift, leases, public-policy exclusions, RLS denials, and route fallbacks are observable without private payloads
- operations UI distinguishes authoritative, desired, projected, and observed state
- every alert has an owner and first diagnostic query
- production canary has automated abort thresholds

Forbidden scope:

- vanity charts without an operational decision
- public operational endpoints
- raw host/session/customer values in logs

Acceptance:

- OP dashboard specification is implemented
- adversarial Alpha-host/Bravo-ID E2E produces no Bravo row, alert, notification, response, or AI context
- preview release and rollback drill complete inside target time
- on-call can identify and contain a deliberately injected stale revision

Rollback: UI can be hidden, but core structured events and safety alerts remain.

## Merge order

```text
TC-00
  -> TC-01
  -> TC-02
  -> TC-03

TC-00
  -> PI-01
  -> PI-02
  -> PI-03

TC-03 + PI-03
  -> AU-01

TC-02
  -> DP-01

TC-03 + PI-03 + AU-01 + DP-01
  -> OP-01
```

PI-01 may run in parallel with TC-01/TC-02 after fixture contracts merge. AU-01 does not merge merely because its code is ready; it waits for public site dependencies and tenant ownership proof.

## Series completion

The series is complete only when compatibility flags have named removal tasks. Leaving both authority paths indefinitely is not a completed migration.
