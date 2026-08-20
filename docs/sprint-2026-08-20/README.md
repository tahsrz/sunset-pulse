# Sunset Pulse Platform Consolidation Sprint

Prepared 2026-08-19 for execution after the weekly quota reset.

## Sprint goal

Make tenant identity, public inventory, and operational side effects explicit platform boundaries, then prove those boundaries with negative security tests and recoverable release procedures.

## Current repository state

- Branch: `codex/crawler-operations-and-retrieval`
- Working tree: more than 60 modified files plus an untracked lead-idempotency migration
- Last repeated production-build result before this packet: successful compile, type validation, and 196 generated pages
- Latest tenant host hardening: focused routing tests passed 3/3
- Important limitation: focused success does not imply the complete branch will pass CI

## P0 facts discovered during planning

1. Middleware bypasses tenant rewrites for `/api` and strips inbound `x-sunset-*` headers. API routes currently reading `x-sunset-tenant` cannot receive trusted tenant identity through that path.
2. Existing migrations include public `site_config` reads and broad realtor policies over shared tables. Route-level checks do not replace tenant-scoped RLS.
3. Public visibility remains caller-selected in parts of the listing repository. The sprint must make the safe API the default.
4. Edge Config is a disposable routing projection. Supabase remains authoritative.

## Packet contents

1. [TenantContext threat model](./01-tenant-context-threat-model.md)
2. [TenantContext contracts](./02-tenant-context-contracts.md)
3. [Database migration design](./03-database-migration-design.md)
4. [Failure-mode analysis](./04-failure-mode-analysis.md)
5. [Security regression matrix](./05-security-regression-matrix.md)
6. [Canonical public inventory](./06-canonical-public-inventory.md)
7. [Current branch decomposition](./07-current-branch-decomposition.md)
8. [Production observability](./08-production-observability.md)
9. [Release and rollback runbooks](./09-release-and-rollback-runbooks.md)
10. [Authoritative identity map](./10-authoritative-identity-map.md)
11. [Implementation blueprint](./11-implementation-blueprint.md)
12. [Sprint task board](./12-sprint-task-board.md)
13. [Migration and RLS query catalog](./13-migration-rls-query-catalog.md)
14. [Architecture decisions and review gates](./14-architecture-decisions-and-review-gates.md)
15. [Day-one critical path](./15-day-one-critical-path.md)
16. [Risk register and contingencies](./16-risk-register-and-contingencies.md)
17. [Pull request implementation contracts](./17-pr-implementation-contracts.md)
18. [Executable test catalog](./18-executable-test-catalog.md)
19. [Data migration rehearsal](./19-data-migration-rehearsal.md)
20. [Production dashboard and alert specification](./20-production-dashboard-and-alert-spec.md)
21. [Five-day execution schedule](./21-five-day-execution-schedule.md)
22. [Day-one execution log](./22-day-one-execution-log.md)
23. [Direct Supabase dependency inventory](./23-direct-supabase-dependency-inventory.md)
24. [Worktree allocation ledger](./24-worktree-allocation-ledger.md)
25. [TC-03 registry adapter preparation](./23-direct-supabase-dependency-inventory.md#tc-03-adapter-preparation)
26. [Staging and production-gated execution plan](./25-staging-and-production-gated-plan.md)

## How to use this packet

- Before editing: read 07, 10, 14, and the first 90 minutes of 15.
- Before schema work: resolve the blocking open decisions in 14 and run Q01-Q08 from 13.
- During implementation: pull tickets from 12, use the PR boundaries in 17, and cite test IDs from 18.
- Before data mutation: complete the matching rehearsal stage in 19.
- Before preview: run the security matrix in 05, postflight catalog in 13, and release drill in 09.
- During canary: use the event, dashboard, and alert contracts in 20.
- During an incident: follow 09, consult the containment boundaries in 16, and preserve database/outbox evidence.

The calendar in 21 is the recommended five-day execution order. The clock-level first day in 15 takes precedence if the worktree or baseline differs from this packet.

Document 22 records the first implementation session, actual verification results, accepted identity decisions, and the remaining TC-02 gates. Document 23 records the direct Supabase dependency boundary and the order required to retire public tenant-configuration access safely.
Document 24 records the path-level ownership allocation for the dirty branch and the publication risks that remain.
Document 25 turns the remaining staging, RLS, TAH operations, and external-provider work into an executable gated plan.

## Recommended first implementation boundary

Start with shared two-tenant fixtures, pure host normalization, typed resolution contracts, and adversarial host tests. This boundary is small enough to review independently and establishes the vocabulary required by the database adapter, public inventory service, and RLS work.

## Execution gates

The sprint is not complete until all of these are true:

- Tenant resolution and authorization are separate contracts.
- API tenant context is derived from the validated host, not an internal header supplied by the browser.
- Tenant A cannot read, render, score, or notify against Tenant B's data.
- Anonymous property routes cannot import Mongo models directly.
- Domain projection drift can cause a temporary 404 but cannot expose another tenant.
- RLS policies match route-level tenant ownership.
- Every migration has a preflight, verification query, and rollback path.
- Full unit tests, targeted Jamie E2E, production build, and negative isolation tests are recorded in the PR.
