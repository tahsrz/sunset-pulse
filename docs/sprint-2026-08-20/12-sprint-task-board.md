# Sprint Task Board

Sizes: XS under 30 minutes, S under 90 minutes, M half day, L one day, XL must be split.

## Milestone 0: Preserve and prove the current worktree

### SP-001: Inventory and checkpoint decision

- Size: S
- Dependencies: none
- Work: classify every modified/untracked file using the PR decomposition.
- Evidence: saved status, file allocation, no unexplained source files.
- Stop condition: any file ownership is ambiguous or overlaps user work unexpectedly.

### SP-002: Repair stale focused tests

- Size: S
- Dependencies: SP-001
- Work: update listing read-surface mocks for public helper names/options; do not weaken production behavior.
- Evidence: focused listing tests pass.

### SP-003: Full verification baseline

- Size: M
- Dependencies: SP-002
- Work: full unit, targeted Jamie E2E, production build.
- Evidence: timestamped results and real failure list.

### SP-004: Migration inventory

- Size: XS
- Dependencies: SP-001
- Work: confirm untracked lead idempotency migration and remote application state.
- Evidence: migration manifest and environment status.

## Milestone 1: Security fixtures before abstraction

### SP-010: Shared tenant fixtures

- Size: S
- Dependencies: SP-003
- Work: Tenant A/B, draft, suspended, custom, preview.
- Evidence: fixture factory used by host and route tests.

### SP-011: Shared listing fixtures

- Size: S
- Dependencies: SP-003
- Work: public/private/demo/deleted/legacy/shared/no-coordinate listings.
- Evidence: one fixture matrix usable across repositories and routes.

### SP-012: Host spoof regression tests

- Size: M
- Dependencies: SP-010
- Work: host/forwarded/internal header, path mismatch, reserved, preview, local cases.
- Evidence: all T01-T12 threat cases represented.

### SP-013: Public inventory regression tests

- Size: M
- Dependencies: SP-011
- Work: all anonymous listing surfaces with private and tenant-crossing negatives.
- Evidence: no private payload or metadata exposure.

### SP-014: RLS cross-tenant integration fixture

- Size: M
- Dependencies: SP-010, database test environment
- Work: anon, consumer, Realtor A/B, service-role policy tests.
- Evidence: Realtor A direct client cannot read B.

## Milestone 2: TenantContext

### SP-020: Host normalization module

- Size: S
- Dependencies: SP-012
- Work: pure normalization and environment classification.
- Evidence: table-driven tests.

### SP-021: Tenant contracts and errors

- Size: S
- Dependencies: SP-020
- Work: implement contracts from document 02.
- Evidence: no role/capability fields in TenantContext.

### SP-022: Domain registry schema migration

- Size: M
- Dependencies: SP-014, reviewed SQL design
- Work: additive domain/outbox/projection tables and RLS.
- Evidence: preflight/postflight queries pass.

### SP-023: Authoritative domain adapter

- Size: M
- Dependencies: SP-021, SP-022
- Work: exact environment/hostname lookup, ambiguity/inactive errors.
- Evidence: dependency errors fail closed.

### SP-024: Publication policy extraction

- Size: M
- Dependencies: SP-021
- Work: extract readiness/billing/review/status logic from `siteData.ts`.
- Evidence: policy truth table.

### SP-025: Request resolver and memoization

- Size: M
- Dependencies: SP-023, SP-024
- Work: request WeakMap promise cache and explicit context.
- Evidence: concurrent calls issue one authoritative lookup.

### SP-026: Tenant page migration

- Size: M
- Dependencies: SP-025
- Work: host context, slug agreement, metadata alignment.
- Evidence: host/path mismatch test and E2E.

### SP-027: Tenant API migration

- Size: L
- Dependencies: SP-025
- Work: featured, hot-list, public leads, Jamie guide/events, recon.
- Evidence: no raw internal tenant-header reads.

## Milestone 3: Canonical public inventory

### SP-030: PublicListing projection

- Size: S
- Dependencies: SP-011
- Work: Zod schema and explicit projection.
- Evidence: owner/metadata/private fields cannot parse into output.

### SP-031: Visibility policy

- Size: S
- Dependencies: SP-030
- Work: canonical policy with purpose and tenant assignment.
- Evidence: policy table tests.

### SP-032: Source adapters

- Size: M
- Dependencies: SP-031
- Work: canonical Supabase and legacy Mongo adapters.
- Evidence: identical visibility behavior under fallback.

### SP-033: Public inventory service

- Size: M
- Dependencies: SP-032, SP-025
- Work: source precedence, assignment, projection, telemetry.
- Evidence: service matrix passes.

### SP-034: Route migration

- Size: L
- Dependencies: SP-033
- Work: migrate anonymous property APIs and tenant page.
- Evidence: public routes no longer import `Property`.

### SP-035: Import-boundary enforcement

- Size: S
- Dependencies: SP-034
- Work: static test/lint check for forbidden imports/helpers.
- Evidence: intentional violating fixture fails check.

### SP-036: Assignment migration design validation

- Size: M
- Dependencies: SP-033
- Work: create/backfill many-to-many assignments in preview/test.
- Evidence: shared listing appears for A/B, private never public.

## Milestone 4: Projection operations

### SP-040: Outbox claim and supersession

- Size: M
- Dependencies: SP-022
- Work: atomic claim, lease, latest revision, retries.
- Evidence: concurrent/stale/obsolete tests.

### SP-041: Deterministic manifest serializer

- Size: S
- Dependencies: SP-022
- Work: stable ordering, version, digest, no private data.
- Evidence: snapshot and digest stability.

### SP-042: Edge writer behind flag

- Size: M
- Dependencies: SP-040, SP-041
- Work: remote write and completion protocol.
- Evidence: forced failure remains retryable.

### SP-043: Reconciliation

- Size: M
- Dependencies: SP-042
- Work: authoritative/projected digest diff and repair enqueue.
- Evidence: missing/stale/extra projection cases.

### SP-044: Atlas projection operations UI

- Size: M
- Dependencies: SP-043, observability events
- Work: lag, state, retry/dead-letter visibility and authorized repair.
- Evidence: operator-only interaction test.

## Milestone 5: RLS and authorization

### SP-050: Direct-client dependency audit

- Size: M
- Dependencies: SP-003
- Work: enumerate site_config/leads/events browser/server queries.
- Evidence: owner and replacement route for every query.

### SP-051: Public site projection

- Size: M
- Dependencies: SP-050, SP-025
- Work: remove need for anonymous full site_config rows.
- Evidence: public page works with private columns inaccessible.

### SP-052: Restrictive RLS migration

- Size: L
- Dependencies: SP-014, SP-050, SP-051
- Work: drop broad policies and add owner-scoped policies.
- Evidence: role matrix integration tests.

## Milestone 6: Operational proof

### SP-060: Structured platform event helper

- Size: M
- Dependencies: contracts stabilized
- Work: event envelope, reason codes, redaction.
- Evidence: PII snapshot tests.

### SP-061: Tenant/domain dashboard data

- Size: M
- Dependencies: SP-043, SP-060
- Work: lag, failures, mismatches, dead letters.
- Evidence: seeded operational-state tests.

### SP-062: TAH baseline instrumentation

- Size: M
- Dependencies: current retrieval PR isolated
- Work: checkpoint, manifest, hydration, latency, provenance.
- Evidence: one cold and one warm trace.

### SP-063: End-to-end tenant isolation proof

- Size: L
- Dependencies: SP-027, SP-034, SP-052
- Work: positive A flow and adversarial A-with-B-identifiers flow.
- Evidence: database and notification assertions.

### SP-064: Preview release drill

- Size: M
- Dependencies: all P0/P1 gates
- Work: migrations, feature flags, failure injection, rollback.
- Evidence: completed runbook with timestamps.

## Parallelization

Safe parallel tracks after SP-003:

- Track A: SP-010 through SP-027 TenantContext
- Track B: SP-011, SP-030 through SP-035 inventory
- Track C: SP-050 through SP-052 RLS audit
- Track D: TAH branch isolation and SP-062

Coordination points:

- SP-033 waits for TenantContext interface but can use a fixture implementation.
- SP-052 waits for public site projection.
- SP-063 waits for all security boundaries.

## Scope guard

Jamie audio is a subsequent focused track unless it blocks validation. Notification outbox generalization follows the tenant/public-data P0 work. Do not silently pull either into TenantContext tasks.

