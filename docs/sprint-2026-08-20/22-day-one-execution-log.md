# Day-One Execution Log

Date: 2026-08-20

## Starting state

- Branch: `codex/crawler-operations-and-retrieval`
- Starting SHA: `2f73e86a19b5d2b0dd114a8e81c4a12468546dda`
- Starting commit: `Wrap crawler operations and retrieval work`
- Runtime: Node `v23.3.0`, npm `10.9.0`
- Existing worktree: 72 modified files, one untracked lead-idempotency migration, and the untracked sprint packet
- Preservation: no stash, reset, clean, pull, merge, branch switch, commit, push, or remote database mutation performed

## Plan review corrections

The implementation review found and corrected three identity-design weaknesses before schema work:

1. `site_config.id` UUID is the phase-one tenant scope (ADR-017). The proposed free-form `tenant_id TEXT` had no authoritative foreign-key target.
2. Domain rows do not duplicate `agent_id`; they load it through `site_config` so identity cannot drift.
3. Listing assignments use non-null `properties.id` UUIDs and explicit revisioned lifecycle fields (ADR-018 and ADR-019). MLS/provider IDs remain backfill aliases only.

Documents 02, 03, 06, 10, 13-17, 19, and 21 were reconciled to those decisions.

## Implemented boundary

### TC-00

- Repaired stale `listing-read-surfaces.test.ts` mocks to use `getPublicListingById`.
- Updated advanced-search expectation to require `publicOnly: true`.
- Added reusable two-tenant, preview-domain, suspended-site, co-listing, expired/revoked assignment, private-listing, suppressed-listing, and sensitive-field fixtures.
- Authority IDs use distinct UUID-shaped values. The deliberate exception is ADR-017: `tenantId` equals the fixture's `siteConfigId`.

### TC-01

- Added immutable TenantContext, domain, publication, access, capability, and error contracts.
- Added strict pure host normalization with typed failures.
- Added pure deployment-environment resolution.
- Added host classification for platform, custom, local, reserved, and global preview forms.
- Reserved platform names, single-label hosts, and all IPv4 literals cannot become tenant candidates.
- `.localhost` tenant candidates are development-only.
- Generic `*.vercel.app` hosts remain global preview hosts and do not yield tenant slugs.
- Custom hosts remain exact registry candidates and never infer ownership from suffix-like text.

No production route, middleware, database schema, or remote projection consumes these contracts yet.

### TC-02 local adapter stage

- Added the exact-match `TenantDomainRegistry` contract and optional projection-candidate contract.
- Added a request-scoped `WeakMap<Request, Promise<Result>>` cache owned by each resolver instance.
- Added an injected resolver factory with explicit environment, clock, request-ID, proxy-trust, and registry dependencies.
- The resolver ignores browser tenant/agent claims and untrusted forwarded hosts.
- Registry, domain, site identity, publication, and optional projection revisions must agree exactly.
- Inactive, unverified, unpublished, expired, malformed, stale, and inconsistent states fail closed with typed errors and one redacted public message.
- An unavailable optional projection degrades to an authoritative registry lookup; it never becomes tenant authority.
- No production route consumes the resolver and no database adapter or migration was added.

### Direct Supabase boundary cleanup

- Removed the browser `site_config` Realtime subscription from `ThemeProvider`. Theme state now starts from the server-rendered tenant payload and no longer receives full-row configuration events in the browser.
- Moved the admin prompt editor behind the operator-authenticated `/api/admin/prompts` route. Browser code no longer reads, upserts, or selects all columns from `site_config`.
- Added the operator-authenticated `/api/admin/intelligence` route and moved the intelligence editor behind it. The route validates a bounded payload, selects the configured server-side agent, and rejects missing target rows instead of reporting a false success.
- Added a static client-boundary regression test that forbids `site_config` references in client modules and records the remaining browser Supabase table dependencies as an explicit golden inventory.
- Added document 23 with the remaining browser and server compatibility paths, their trust characteristics, and the required replacement order.
- Added document 24 with a path-level allocation for every modified or untracked worktree path, including documented overlaps.
- Deliberately did not give the layout, Jamie, or property recon paths service-role access. Those paths still use ambient or browser-influenced agent selection and must first consume authoritative host-derived TenantContext.

## Defect found during focused testing

Initial HST-016 failed because a reserved one-label platform subdomain (`admin.sunsetpulse.app`) fell through to the custom-domain candidate path. The classifier now handles reserved one-label platform names before custom-domain fallback. The regression test passes.

## Verification evidence

### Baseline before new modules

- `listing-read-surfaces.test.ts`: 2 failed / 2 passed, both stale expectations predicted by the plan
- after stale test repair: 4/4 passed
- identity/listing focus set: 5 files, 21/21 passed
- full unit baseline: 175 files passed, 2 timed out; 692/694 tests passed
- timed-out tests rerun independently: 2/2 passed
- production build before new modules: passed compile, type validation, and 196/196 static pages

The two full-suite timeouts were:

- `destructive-db-scan.test.ts`
- `voltagent-command-advisor.test.ts`

Both completed normally in the independent run, indicating parallel-suite resource contention rather than a functional failure.

### After TC-00/TC-01

- focused tenant/listing set: 5 files, 40/40 tests passed
- bounded full unit suite (`--maxWorkers=50%`): 179/179 files and 723/723 tests passed
- strict direct TypeScript check: new files clean; command still reports pre-existing test-only errors listed below
- production build: passed compile, type validation, and 196/196 static pages

### After the TC-02 local adapter stage

- focused tenancy set: 3 files, 51/51 tests passed
- resolver matrix alone: 22/22 tests passed, covering RES-001 through RES-019 behaviors represented at this stage
- bounded full unit suite (`--maxWorkers=50%`): 180/180 files and 745/745 tests passed
- production build: passed compile, type validation, and 196/196 static pages
- strict direct TypeScript check: no new errors; the same six pre-existing test-only errors remain

### After the direct Supabase boundary cleanup

- focused resolver/API/client-boundary set: 3 files, 28/28 tests passed
- production build: passed compile, type validation, and 196/196 static pages
- first bounded full unit suite (`--maxWorkers=50%`): 181 files passed, one `voltagent-command-advisor.test.ts` timeout; 750/751 tests passed
- timed-out test rerun independently: 1/1 passed in approximately 512 ms
- definitive bounded full unit suite (`--maxWorkers=25%`): 182/182 files and 751/751 tests passed
- strict direct TypeScript check: no new errors; the same six pre-existing test-only errors remain

The lower-concurrency full run confirms the intermediate timeout was parallel-suite resource contention, not a functional regression.

### TC-03 registry adapter preparation

- Added a server-only exact `(environment, hostname)` Supabase registry adapter for the proposed `tenant_domains` relation.
- Bounded the query to domain identity, site identity, publication, billing, and review fields; missing service-role configuration and Supabase failures become typed dependency failures.
- Added mapping tests for a valid relation, site identity mismatch, and blocked publication state.
- Kept layout, Jamie, and recon on their existing compatibility paths because the migration and real RLS fixture are not available. The adapter is not wired into production routes yet.
- Removed recon's browser-supplied `x-sunset-tenant-agent-id` lookup as an interim fail-closed measure; recon uses neutral defaults until authoritative TenantContext is available.
- Added a source-boundary regression test proving recon cannot reintroduce browser-selected `site_config` reads.
- Added Jamie route regression coverage for anonymous prompt fields and the authenticated operator exception: browser agent IDs and memory are ignored, while dev/guarded controls require operator access.
- focused adapter/resolver/client-boundary set: 3 files, 27/27 tests passed
- production build: passed compile, type validation, and 196/196 static pages
- recon boundary set: 4 files, 28/28 tests passed after the fail-closed change
- Jamie trust-boundary test set now covers anonymous and operator control paths.

### Public inventory projection slice

- Added `publicInventory.ts` with a strict allow-listed `PublicListing` schema that excludes `owner`, arbitrary `metadata`, seller fields, and internal diagnostics.
- Applied the projection to `GET /api/properties/[id]` after the existing public repository visibility checks.
- Migrated `GET /api/properties/search` away from raw Mongo reads to the canonical repository and public projection.
- Disabled browser-header tenant selection in featured and hot-list public APIs; they use the global canonical hot-list fallback until authoritative TenantContext is available.
- Added a static regression test covering both featured and hot-list routes so browser tenant headers cannot be reintroduced.
- Migrated location-guess and value-guess historical feeds from raw Mongo reads to the bounded public historical inventory helper.
- Applied the public projection to the discovery feed while preserving its distance field.
- Added discovery-feed regression coverage proving private metadata and owner fields are absent from the projected response.
- Applied the same projection to featured, hot-list, and Kepler spatial responses; Kepler no longer serializes raw listing metadata.
- Added a boundary regression for the Kepler route and a response assertion for metadata absence.
- Extended the projection to the general properties feed and advanced search; cached advanced results now cache only projected records.
- Discovery/public-read focus: 3 files, 14/14 tests passed.
- Historical public inventory focus: 4 files, 11/11 tests passed
- Production build after discovery projection: passed compile, type validation, and 196/196 static pages
- public inventory batch focus: 4 files, 15/15 tests passed
- production build after the batch: passed compile, type validation, and 196/196 static pages
- Added negative projection tests for private and demo records.
- public inventory and trust-boundary focus: 7 files, 38/38 tests passed
- production build after route migration: passed compile, type validation, and 196/196 static pages
- bounded full unit run (`--maxWorkers=25%`): 184 files passed, one known VoltAgent timeout; 758/759 tests passed
- isolated VoltAgent rerun: 1/1 passed in 588 ms

Local sandbox network calls failed during static generation with `EACCES`, but existing application fallbacks contained those failures and both production builds exited successfully.

## Existing direct-TypeScript debt

`npx tsc --noEmit -p tsconfig.json` directly includes test files that the Next production build does not type-check. After the new fixture error was corrected, these unrelated errors remain:

- `tests/jamie-public-guide.spec.ts`: `guide` narrowed to `never` at two assertions
- `tests/unit/tah-v3_6.test.ts`: result source possibly null
- `tests/unit/weekly-dispatch.test.ts`: three mock calls possibly undefined

These belong to a focused test-type stabilization change and were not mixed into TC-00/TC-01.

## TC-02 gate status

Resolved:

- tenant scope key: ADR-017
- canonical assignment key: ADR-018
- assignment lifecycle: ADR-019
- pure host/environment contract
- two-tenant and adversarial fixtures
- path-level worktree allocation ledger

Still required:

- Q05-Q08 against an approved local/staging/scrubbed database
- normalized-domain collision count
- ownerless/missing-agent site disposition
- migration of the remaining layout, Jamie, and property-recon `site_config` reads to authoritative host-derived TenantContext
- real anonymous/two-JWT RLS fixture capability
- reviewed executable migration and rollback flag names

Configuration files contain the expected database/Supabase variable names, but values were not printed or used. The Supabase CLI is not installed locally. No production query was attempted.

## Files added

```text
apps/pulse/lib/tenancy/contracts.ts
apps/pulse/lib/tenancy/domainRegistry.ts
apps/pulse/lib/tenancy/environment.ts
apps/pulse/lib/tenancy/errors.ts
apps/pulse/lib/tenancy/normalizeHost.ts
apps/pulse/lib/tenancy/requestCache.ts
apps/pulse/lib/tenancy/resolveTenantContext.ts
apps/pulse/lib/tenancy/supabaseTenantDomainRegistry.ts
apps/pulse/lib/data/publicInventory.ts
apps/pulse/app/api/admin/intelligence/route.ts
apps/pulse/tests/fixtures/listingFixtures.ts
apps/pulse/tests/fixtures/tenantFixtures.ts
apps/pulse/tests/unit/admin-intelligence-route.test.ts
apps/pulse/tests/unit/tenant-client-data-boundary.test.ts
apps/pulse/tests/unit/supabase-tenant-domain-registry.test.ts
apps/pulse/tests/unit/recon-tenant-header-boundary.test.ts
apps/pulse/tests/unit/public-inventory.test.ts
apps/pulse/tests/unit/tenant-context-contracts.test.ts
apps/pulse/tests/unit/tenant-context-resolver.test.ts
apps/pulse/tests/unit/tenant-host-normalization.test.ts
docs/sprint-2026-08-20/23-direct-supabase-dependency-inventory.md
```

Existing files intentionally changed:

```text
README.md
apps/pulse/app/admin/intelligence/page.tsx
apps/pulse/app/admin/prompts/page.tsx
apps/pulse/app/api/admin/prompts/route.ts
apps/pulse/app/api/properties/[id]/route.ts
apps/pulse/app/api/properties/[id]/recon/route.ts
apps/pulse/app/api/properties/discover/route.ts
apps/pulse/app/api/kepler/listings/route.ts
apps/pulse/app/api/properties/route.ts
apps/pulse/app/api/properties/search/advanced/route.ts
apps/pulse/app/api/properties/search/route.ts
apps/pulse/app/api/properties/featured/route.ts
apps/pulse/app/api/properties/hot-list/route.ts
apps/pulse/context/ThemeProvider.tsx
apps/pulse/tests/unit/listing-read-surfaces.test.ts
apps/pulse/tests/unit/jamie-chat-route.test.ts
apps/pulse/tests/unit/public-tenant-header-boundary.test.ts
apps/pulse/tests/unit/historical-public-inventory.test.ts
```

## Recommended next action

1. Run Q05-Q08 against an approved staging or scrubbed database and save aggregate evidence.
2. Review the executable migration and rollback flag names against those results.
3. Reconcile the adapter's publication revision source with the reviewed schema; the current mapper uses the domain revision only as a compatibility fallback.
4. Migrate layout, Jamie, and property recon to the host-derived resolver before changing their Supabase privilege level or removing public `site_config` access.
5. Run the adapter against staging only after the schema gate opens, then add real RLS and authoritative mismatch tests.

## Publication status

No commit, push, or PR was requested or performed. The broader worktree remains intentionally dirty and must still follow the path-aware decomposition before publication.
