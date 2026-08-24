# Five-Day Execution Schedule

This is an aggressive but defensible first sprint. It aims to merge the pure contracts and produce reviewed database/public-inventory foundations. It does not promise that every production route, RLS policy, and Edge projection will ship in five days.

## Sprint objective

Deliver a proven tenant-resolution contract and public-listing safety contract, with migrations rehearsed and the next rollout PRs ready. Security evidence matters more than feature count.

## Roles

One person may hold multiple roles, but the responsibilities remain explicit:

- Sol: implementation and focused verification
- Security reviewer: trust boundaries, negative tests, RLS
- Data owner: identity/backfill conflicts and canonical listing keys
- Platform operator: Supabase/Vercel/Edge projection and release controls
- Product owner: public visibility, coordinate, recon, and 404 decisions
- Release owner: worktree/PR scope, checks, canary, rollback

## Day 1: Preserve, baseline, and define trust

Primary tickets: SP-001, SP-002, SP-003, SP-004, SP-010, SP-011, SP-012, SP-020, SP-021.

Morning:

- execute the first 90 minutes in document 15
- classify every dirty file and protect user-owned/unrelated changes
- repair stale listing read-surface tests
- record full unit/build/targeted E2E baseline
- resolve migration ordering facts

Afternoon:

- create two-tenant, preview, suspended, and listing fixtures
- implement pure host normalization and typed resolution failures
- run HST suite and resolver fake-adapter skeleton
- decide OD-001, OD-010, and proxy trust behavior

End-of-day artifact:

- TC-00 ready for review
- TC-01 draft or ready depending on baseline failures
- complete handoff template from document 15

No-go:

- unexplained worktree overlap
- tests cannot distinguish existing from introduced failure
- host trust behavior remains ambiguous

## Day 2: Authoritative resolver and projection contract

Primary tickets: SP-013, SP-014, SP-022, SP-023, SP-025, SP-030, SP-031.

Track A - TenantContext:

- run Q01-Q08 against local/staging data
- verify ADR-017's `site_config.id` tenant scope against Q05-Q08 production-shaped data
- draft/apply additive registry schema in disposable database
- implement exact registry adapter and request-Promise cache
- run RES and DBR focused suites

Track B - Public inventory:

- implement runtime `PublicListing` schema
- implement projection and canonical eligibility policy
- populate every forbidden field in fixtures
- run PRJ/VIS suites

Coordination:

- both tracks use the same tenant/listing identity fixtures
- no route consumes unfinished resolver or projection yet
- security reviewer checks contracts before adapters spread

End-of-day artifact:

- TC-02 draft with staging preflight evidence or a documented data blocker
- PI-01 ready for review

Scope-cut checkpoint:

If domain conflicts or tenant key ambiguity remain, stop executable schema work. Continue pure resolver tests with a fake adapter and prioritize the conflict report.

## Day 3: Migrate narrow read surfaces

Primary tickets: SP-024, SP-026, SP-027, SP-032, SP-033, SP-034, SP-035.

Tenant route slice:

- migrate one tenant page entry and one API route to host-derived context
- remove trusted use of `x-sunset-tenant` from migrated routes
- run spoof, preview, suspension, and stale-projection cases
- instrument `tenant.resolution`

Inventory slice:

- build source adapters around existing listing repository
- implement public inventory service
- migrate a small route group, preferably detail plus one list surface
- add import boundary enforcement
- instrument `public_inventory.decision`

Integration:

- run SUR cases for the migrated group
- run Jamie listing-context focused tests when the shared listing helper changes
- perform preview browser smoke with Alpha/Bravo fixtures

End-of-day artifact:

- TC-03 narrow draft
- PI-02 partial draft with explicit route allow-list
- measured resolver/inventory latency baseline

No-go:

- any tenant route falls back to global listing inventory
- counts/pagination leak hidden records
- migrated API route trusts browser tenant claims

## Day 4: Assignment and RLS rehearsal

Primary tickets: SP-036, SP-050, SP-051, preparation for SP-052.

Morning:

- verify ADR-018/ADR-019 canonical property key and assignment lifecycle in the rehearsal SQL
- execute R1/R2/R3 rehearsal stages where data is available
- generate domain and assignment conflict artifacts
- validate query plans and deterministic output digests

Afternoon:

- audit every browser-side direct Supabase dependency on affected tables
- implement typed public site projection
- replace one representative full-row public dependency
- run two-real-JWT RLS fixture against proposed policies

End-of-day artifact:

- PI-03 migration draft plus deterministic dry-run report
- AU-01 dependency ledger and policy draft
- explicit list of browser dependencies still blocking RLS merge

Scope-cut checkpoint:

Do not merge restrictive RLS if direct-client dependencies are unresolved. The acceptable result is a reviewed dependency list and staged migration, not an availability incident.

## Day 5: System proof and next release decision

Primary tickets: SP-040 preparation, SP-060, SP-062, SP-063, SP-064 preparation.

Morning:

- run all focused lanes: HST, RES, PRJ, VIS, SUR, DBR, available RLS
- run full unit suite and production build
- run E2E-001 and release-blocking E2E-002
- verify structured events contain no forbidden data

Afternoon:

- perform preview canary and rollback drill for merged/ready components
- review every exposure 12+ in risk register
- close or assign every test skip/open decision
- update branch decomposition and compatibility-path removal tasks
- prepare next sprint/PR publication order from actual evidence

End-of-sprint outcomes:

Green:

- TC-00 and TC-01 merged/ready
- TC-02 and PI-01 merged or review-ready with clean evidence
- at least one route uses the secure resolver/projection behind a flag
- deterministic migration rehearsal passes
- adversarial E2E passes in preview

Yellow:

- contracts/tests are sound but data conflicts or direct-client dependencies block migration
- conflict/dependency artifacts have owners and dates
- no unsafe partial rollout occurred

Red:

- cross-tenant result, ambiguous authority, unsafe public projection, or unreproducible baseline
- stop publication and invoke the relevant containment/runbook

## Daily cadence

09:00 - worktree/status and new user changes

09:15 - risk/open-decision check

09:30-12:00 - primary implementation boundary

12:00 - focused tests and evidence checkpoint

13:00-15:30 - secondary/parallel boundary

15:30 - integration and failure analysis

16:30 - full relevant verification, diff review, docs/evidence

17:30 - handoff; commit/PR only when requested and coherent

The cadence deliberately reserves verification time. A late implementation that cannot be reviewed and tested moves to the next day.

## Merge policy for the week

- TC-00 may merge after baseline evidence.
- TC-01 may merge independently because it is pure and unused.
- PI-01 may merge independently after projection snapshots and forbidden-field tests.
- TC-02 schema/resolver waits for data preflight and security review.
- TC-03 and PI-02 remain route-flagged through preview proof.
- PI-03 and AU-01 do not merge without database/RLS integration evidence.
- DP-01 and full production rollout are expected follow-on work unless the earlier gates finish unusually cleanly.

## Deferred backlog, already bounded

- Edge projection worker and Atlas controls after authoritative resolver proof
- full route fleet migration after small-group results
- final restrictive RLS after every browser dependency is replaced
- Jamie audio state-machine follow-up
- notification outbox generalization
- advanced TAH confidence calibration and new consumers
- removal of legacy domain/site/listing fields after compatibility window

## Sprint review questions

1. Which identity claim became authoritative in code, and which claims were demoted?
2. Can Alpha-host/Bravo-ID traffic reach any Bravo response, row, event, alert, or AI context?
3. Can a reviewer enumerate every field in public site and listing projections?
4. Which production data conflicts prevent deterministic migration?
5. Which direct browser queries still prevent restrictive RLS?
6. What is the measured resolver/public-inventory latency?
7. Which compatibility paths remain, and when are they removed?
8. Can the release owner roll back without restoring an unsafe policy?
