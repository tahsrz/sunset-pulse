# Day-One Critical Path

The first day is about establishing a trustworthy floor and landing one narrow security boundary. It is not a race to create all proposed tables. No commit is required until the focused boundary is coherent and verified.

## Day-one outcome

By end of day, Sunset Pulse should have:

1. A preserved inventory of the current dirty branch.
2. A reproducible test/build baseline.
3. Shared two-tenant and listing fixtures.
4. Failing host-spoof and public-projection regression tests that describe the desired boundary.
5. A reviewed host normalization module and typed resolver contract, or a clearly recorded blocker preventing implementation.

The day is successful even if no production route has migrated yet. It is unsuccessful if code is written before the current branch and security fixtures are understood.

## First 30 minutes: preserve reality

### 00:00-00:10 - Confirm branch and worktree

Run from repository root:

```powershell
git branch --show-current
git status --short
git diff --stat
git diff --name-only
git ls-files --others --exclude-standard
```

Capture the output in the task notes. Do not stash, reset, clean, commit, pull, merge, or switch branches during this inspection.

Expected facts to confirm:

- branch is `codex/crawler-operations-and-retrieval`
- the lead-idempotency migration remains intentionally classified
- planning documents are untracked or deliberately staged only when the user requests publication
- nested worktrees, crawler checkpoints, TAH binaries, and local backups are identified separately

Stop when an unexplained file overlaps a planned implementation module.

### 00:10-00:20 - Build a file allocation ledger

For every modified/untracked file, assign exactly one value:

- PRA authentication/response correctness
- PRB billing/provisioning
- PRC lead identity
- PRD notifications
- PRE public inventory
- PRF TenantContext
- PRG TAH/crawler/Atlas
- PRH mechanical stabilization
- local/generated/excluded
- user-owned/needs confirmation

No `miscellaneous` bucket is allowed. A file that belongs to two PRs indicates a boundary that needs extraction before publication.

### 00:20-00:30 - Freeze the starting SHA and environment facts

Record:

```powershell
git rev-parse HEAD
node --version
npm --version
git log -1 --oneline
```

Also record whether local Supabase, Mongo, and test credentials are available without printing values. Note missing dependencies now so later failures are not mistaken for product regressions.

## Minutes 30-90: repair and establish baseline

### 00:30-00:50 - Repair stale listing test contracts

Target:

```text
apps/pulse/tests/unit/listing-read-surfaces.test.ts
```

The test currently reflects legacy repository names/options. Update its mocks and expectations to the existing safe public helpers. Do not reintroduce a caller-selected `publicOnly` escape hatch merely to satisfy the old test.

Focused command:

```powershell
npx vitest run apps/pulse/tests/unit/listing-read-surfaces.test.ts
```

If Vitest path resolution expects workspace-relative paths, run from `apps/pulse` with `tests/unit/listing-read-surfaces.test.ts`.

### 00:50-01:10 - Run identity/listing focus set

```powershell
npx vitest run `
  apps/pulse/tests/unit/listing-contract.test.ts `
  apps/pulse/tests/unit/listing-discovery.test.ts `
  apps/pulse/tests/unit/listing-repository-mock.test.ts `
  apps/pulse/tests/unit/tenant-site-conversion.test.ts `
  apps/pulse/tests/unit/site-config-store.test.ts
```

Classify each failure:

- stale test
- implementation regression
- missing dependency/environment
- nondeterminism
- existing unrelated failure

Fix only stale tests in this block. Behavioral defects become explicit tasks.

### 01:10-01:30 - Run full baseline

Preferred sequence:

```powershell
npm run test:unit
npm run pulse:build
```

Run targeted Jamie E2E after the build baseline if required dependencies are available:

```powershell
npx playwright test apps/pulse/tests/jamie-public-guide.spec.ts --reporter=line
```

Record totals, duration, and the first causal failure. Do not summarize a suite as passing if a command was skipped or exited before collection.

## Hours 2-3: security fixtures first

### Build two canonical tenants

Create a shared fixture factory representing:

- Tenant A: active production platform domain, verified custom domain, published site
- Tenant B: active production platform domain, different owner and agent
- Tenant Preview: same conceptual tenant but preview-only hostname and revision
- Tenant Suspended: exact valid domain with non-active lifecycle
- Unknown host: syntactically valid but absent

Each fixture must use distinct IDs for tenant, site, agent, owner, domain, and revision. Similar IDs hide accidental joins.

### Build listing fixtures

At minimum:

- globally eligible listing assigned to Tenant A
- globally eligible listing assigned to Tenant B
- eligible listing assigned to both tenants for co-listing
- private/internal listing assigned accidentally
- public listing with no assignment
- expired assignment
- revoked assignment
- suppressed MLS listing
- listing with sensitive owner/seller/private remarks/metadata fields populated
- listing whose precise coordinate policy requires fuzzing

### Implement negative host cases

Required table-driven inputs:

```text
tenant-a.example.com
TENANT-A.EXAMPLE.COM
tenant-a.example.com.
tenant-a.example.com:443
tenant-a.example.com.evil.test
eviltenant-a.example.com
tenant-a.example.com,tenant-b.example.com
https://tenant-a.example.com/path
tenant-a.localhost:3000
preview-123.vercel.app
```

For each input, define normalized result or exact typed failure. A test must say which environment it belongs to.

## Hours 3-5: land the pure boundary

### Host normalization module

Implement only the pure parser/normalizer first. It should:

- accept the server-observed host value
- trim permitted transport formatting deliberately
- normalize case and trailing dot according to the contract
- split a valid port without accepting schemes, paths, commas, whitespace, user info, or control characters
- classify local/platform/custom/preview only after syntax validation
- return a typed value or typed rejection reason

It must not:

- query a database
- read cookies or request bodies
- select a tenant
- authorize an actor
- infer production from an arbitrary Vercel hostname

### Tenant contracts

Create discriminated resolution results before the adapter:

```ts
type TenantResolution =
  | { ok: true; context: TenantContext }
  | { ok: false; reason: TenantResolutionFailure };
```

Failure values should distinguish telemetry while mapping to a uniform public response where required:

- invalid_host
- unknown_domain
- wrong_environment
- pending_verification
- pending_propagation
- suspended
- revoked
- stale_projection
- configuration_error

Do not include secrets, verification tokens, or candidate tenant IDs in public error bodies.

### Unit-test review gate

The pure module is ready when:

- all table-driven cases pass
- fuzz/property tests cannot produce schemes, paths, commas, or suffix matches as valid hostnames
- normalization is idempotent
- development inputs never resolve as production
- no code path reads `x-sunset-tenant`

## Hours 5-7: adapter design and database proof

### Run query catalog Q01-Q08

Use staging or a scrubbed database. Produce counts, not customer records.

Resolve before schema implementation:

- duplicate normalized domains
- ownerless sites
- missing agent IDs
- ambiguous tenant key type
- current direct-client dependency on public `site_config`
- browser queries relying on all-realtor policies

### Adapter interface

The first adapter should expose one exact lookup:

```ts
interface TenantDomainRegistry {
  findExact(input: {
    environment: TenantEnvironment;
    hostname: NormalizedHostname;
  }): Promise<TenantDomainRecord | null>;
}
```

No fuzzy query, global fallback, or caller-selected tenant is part of this interface.

### Resolver orchestration test

Build the resolver against a fake adapter before the migration exists. Prove:

- concurrent calls for the same `Request` share one Promise
- separate requests do not share request-local state
- registry hit plus authoritative mismatch fails closed
- inactive states fail closed
- stale Edge candidate cannot activate a tenant
- errors are structured and redacted

## Hours 7-8: decide whether to code the schema

Proceed with executable migration only when:

- ADR-017's `site_config.id` tenant scope is reflected consistently in contracts and draft SQL
- Q05-Q08 have no unexplained conflicts
- direct-client public site dependencies are inventoried
- two-tenant RLS fixture can run
- rollback flag and compatibility read are named

Otherwise, stop at a reviewed migration draft. A delayed safe migration is better than encoding guessed ownership.

## End-of-day verification

Run:

```powershell
npx vitest run apps/pulse/tests/unit/tenant-host-normalization.test.ts
npx vitest run apps/pulse/tests/unit/tenant-context-resolver.test.ts
npm run test:unit
npm run pulse:build
git diff --check
git status --short
```

Use actual paths if final test names differ. Record skipped commands and reasons.

## End-of-day handoff template

```text
Starting SHA:
Worktree allocation complete: yes/no
Baseline unit result:
Baseline build result:
Focused security result:
Files changed:
Decisions closed:
Open decision blockers:
Database preflight counts:
Security invariants proven:
Known failures not introduced today:
Recommended first action tomorrow:
Commit/PR status (if requested):
```

## Commit boundary recommendation

The first coherent commit should contain only:

- shared tenant/listing security fixtures
- host normalization and resolution contracts
- focused unit tests
- documentation changes directly describing those contracts

Do not include the domain schema, public inventory migration, Edge projection worker, RLS replacement, Jamie audio, crawler state, or unrelated type fixes in that commit. Those each have their own review and rollback surface.

## Critical path after day one

```text
fixtures and baseline
  -> host normalization/contracts
  -> exact authoritative resolver
  -> API/page migration
  -> PublicListing projection and assignment policy
  -> tenant listing assignment migration
  -> public site projection
  -> restrictive RLS migration
  -> domain outbox/Edge projection
  -> reconciliation and Atlas operations
  -> preview drill
  -> production canary
```

Parallel work is allowed only where it does not invent an unresolved identity:

- TAH SLO instrumentation can proceed independently.
- Public inventory fixtures can proceed while resolver code is built.
- RLS dependency inventory can proceed before the restrictive migration.
- Jamie audio remains outside this critical path unless it blocks the shared E2E baseline.
