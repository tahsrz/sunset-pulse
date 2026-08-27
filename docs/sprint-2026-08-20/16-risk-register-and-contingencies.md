# Risk Register and Contingencies

Scales:

- Probability: 1 rare, 5 expected
- Impact: 1 local inconvenience, 5 security incident or production outage
- Exposure: probability x impact

The owner field names a role until people are assigned at kickoff. Every exposure of 12 or greater is reviewed daily.

## Ranked register

| ID | Risk | P | I | Exposure | Earliest signal | Mitigation | Contingency / owner |
|---|---|---:|---:|---:|---|---|---|
| R-01 | Broad existing RLS leaks another tenant despite route fixes | 4 | 5 | 20 | Authenticated A client can select B row | Two-tenant JWT fixture before policy migration; direct-client audit | Disable affected browser surface and route through authorized server API; security owner |
| R-02 | Dirty branch mixes unrelated behavior into security PR | 5 | 4 | 20 | One file maps to multiple PRs; unexplained untracked files | File allocation ledger and clean worktree/branch strategy before edits | Pause publication; split by patch/cherry-pick only after user-approved preservation; release owner |
| R-03 | Host/proxy trust differs between local, preview, and production | 4 | 5 | 20 | Production host logs disagree with test assumptions | Explicit trusted-proxy mode, server-observed host telemetry, preview probes | Disable tenant resolver flag for affected environment; platform owner |
| R-04 | Full public `site_config` policy exposes newly added private fields | 4 | 5 | 20 | Anonymous full-row projection contains prompt/billing/integration fields | Typed public projection and dependency audit before policy removal | Block public site admin data path; serve minimal static projection; security owner |
| R-05 | Legacy domain data contains duplicate normalized ownership | 4 | 5 | 20 | Q06/Q07 returns rows | Conflict report; never guess winner; exact environment uniqueness | Exclude conflicting domains from backfill and require manual verification; data owner |
| R-06 | Tenant/listing relation has no authoritative key for legacy Mongo rows | 4 | 4 | 16 | Assignment backfill cannot map stable canonical UUID | Alias table/spike; stable canonical key decision OD-008 | Keep legacy public compatibility only on global surface; tenant route returns 404; inventory owner |
| R-07 | Public projection misses a sensitive nested field | 3 | 5 | 15 | Snapshot diff or response schema admits arbitrary metadata | Allow-list runtime schema; forbidden-field recursive assertion | Roll back route to prior safe projection or suppress surface; security owner |
| R-08 | Edge manifest drift activates stale ownership | 3 | 5 | 15 | Applied revision/tenant differs from DB desired state | Server authoritative confirmation; revisioned manifest; reconciliation | Treat domain unresolved and return 404; projection owner |
| R-09 | Migration removes access still used by a browser Supabase query | 5 | 3 | 15 | Preview 401/empty states after RLS tightening | Static direct-client inventory plus browser smoke suite | Re-enable only a narrow owner policy or server route, never broad legacy policy; feature owner |
| R-10 | Agent/tenant/site IDs encode inconsistent identities | 4 | 4 | 16 | Leads/events fail joins or map to multiple sites | Identity map; authoritative foreign keys; null/duplicate preflight | Quarantine ambiguous records from notifications/scoring; data owner |
| R-11 | Shadow reads double database load or expose private discrepancies | 3 | 4 | 12 | DB latency/egress rises; logs contain payloads | 1% sample, timeout, hashes/categories only | Disable shadow comparison independently; platform owner |
| R-12 | Outbox remote success/local failure duplicates side effects | 3 | 4 | 12 | Same domain revision/provider key appears twice | Idempotency, `unknown_delivery`, provider reconciliation | Stop worker, reconcile claimed jobs, resume from bounded cursor; operations owner |
| R-13 | Worker races apply obsolete revision | 3 | 4 | 12 | Applied revision moves backward or ahead of desired | CAS completion and supersession in claim transaction | Rebuild complete environment manifest from DB; projection owner |
| R-14 | Resolver shared cache survives a reassignment too long | 3 | 4 | 12 | Revoked domain still resolves after mutation | Revision-tagged cache, short negative TTL, mutation invalidation | Bypass shared cache; retain request-local dedupe; platform owner |
| R-15 | Uniform 404 behavior is implemented inconsistently and leaks existence | 3 | 4 | 12 | Timing/body/header differs for cross-tenant and missing records | Shared public error mapper; response snapshots and timing observation | Route all protected misses through common handler; security owner |
| R-16 | Public listing policy differs across grid/detail/map/Jamie | 4 | 3 | 12 | Same listing appears on one surface but not another | One public inventory service and fixture matrix across surfaces | Disable inconsistent consumer and use canonical route response; inventory owner |
| R-17 | Full CI remains noisy and hides security regression | 4 | 3 | 12 | Security tests buried behind unrelated flaky E2E | Independent required tenant-security lane | Block merge on focused security job even if broad suite is quarantined; engineering owner |
| R-18 | Production data volume makes exact resolver or assignment lookup slow | 3 | 4 | 12 | Staging query plan scans; p95 exceeds target | Composite unique/indexes, production-like explain plans | Feature-flag fallback only if fallback is equally authoritative; database owner |
| R-19 | Preview deployment reads production domain projection | 2 | 5 | 10 | Preview host resolves production tenant | Environment in every key/table/query; no fallback | Disable preview tenant feature; platform owner |
| R-20 | Service-role client leaks into browser bundle | 2 | 5 | 10 | bundle scan or browser network exposes privileged key | server-only modules/import guards/env checks | Rotate key, invalidate deployment, security incident process; security owner |
| R-21 | Domain verification token is logged or stored plaintext | 2 | 5 | 10 | token appears in DB/log search | Store hash only, redact logs, short expiry | Rotate challenge and purge logs under incident policy; platform owner |
| R-22 | Feature flags create impossible mixed states | 3 | 3 | 9 | New resolver with old policy or new route with missing table | Defined flag dependency graph and release stages | Roll flags back in reverse dependency order; release owner |
| R-23 | TAH cold hydration is counted as retrieval outage | 4 | 2 | 8 | latency spikes only on cold instances | Separate readiness/cold/warm metrics and manifest validation | Route to bounded remote/shared fallback with provenance; AI platform owner |
| R-24 | TAH cartridge is partially written/read | 2 | 4 | 8 | checksum/read errors and nondeterministic results | Atomic temp write + rename + ready manifest/checksum | Ignore invalid cartridge, retain last known good, alert crawler owner |
| R-25 | Audio lifecycle work contaminates platform sprint | 4 | 2 | 8 | shared provider changes appear in tenant PR | Keep separate track unless baseline E2E is blocked | Revert only audio slice or defer; Jamie owner |
| R-26 | Coordinate fuzzing causes misleading property placement | 3 | 3 | 9 | user sees marker on wrong parcel/area | Product/compliance decision and clear precision semantics | Omit coordinates rather than fabricate unsafe precision; product owner |
| R-27 | Global listing fallback preserves conversion but violates tenant publication | 3 | 5 | 15 | unassigned listing appears on tenant host | No tenant fallback invariant in repository | Immediate route flag off; incident review for exposed IDs; security owner |
| R-28 | Domain deletion cascades away forensic outbox state | 2 | 4 | 8 | removal incident lacks job history | Prefer soft revoke; audit record before destructive cleanup | Restore from audit log/backups; projection owner |

## Schedule risk and scope cuts

When the sprint falls behind, cut in this order:

1. Defer Atlas visualization polish; retain metrics, logs, and a queryable operations route.
2. Defer Edge manifest sharding; keep one bounded versioned environment manifest.
3. Defer global consumer migration beyond the explicitly enumerated public routes.
4. Defer shadow-read dashboards; retain sampled discrepancy events.
5. Defer custom-domain self-service UI; retain reviewed server mutation and status.
6. Defer advanced coordinate fuzzing; omit location when exact coordinates are not approved.
7. Defer Jamie audio and notification generalization entirely.

Never cut:

- exact host/environment resolution
- server-authoritative confirmation
- `PublicListing` allow-list projection
- no-global-fallback tenant policy
- two-tenant negative tests
- RLS preflight/postflight
- deterministic backfill conflict handling
- rollback flags and production observability

## Dependency deadlocks

### Domain schema drifts from the accepted tenant scope

Resolution:

- Enforce ADR-017: phase-one relations reference `site_config.id` directly.
- Reject any draft migration that reintroduces a free-form tenant key or treats `agent_id` as a tenant foreign key.
- If multi-site organizations become necessary, stop and design an explicit organization migration rather than mutating ADR-017 implicitly.

### RLS migration waits on direct-client replacement

Resolution:

- Inventory every `.from('site_config')`, `.from('leads')`, and other affected browser call.
- Replace or narrowly authorize each dependency.
- Keep the restrictive policy PR separate so availability failures are attributable.

### Public inventory waits on assignments

Resolution:

- Implement projection and canonical eligibility against fixture assignments first.
- Migrate global public surfaces without tenant filtering only where the product is intentionally global.
- Tenant routes remain behind the assignment feature flag until backfill verifies.

### Edge worker waits on remote credentials

Resolution:

- Implement serializer, claim, supersession, and fake writer locally.
- Preview can use a fake/in-memory adapter for contract tests.
- Do not block TenantContext's authoritative database resolver on Edge Config availability.

## Failure containment boundaries

| Failure | Contained behavior |
|---|---|
| Edge Config unavailable | DB-confirmed resolver or temporary 404; no cross-tenant fallback |
| Supabase unavailable | Tenant-protected route unavailable; no cached identity extension beyond policy |
| Mongo listing source unavailable | No listing or last-known canonical public record only if policy/version remains valid |
| Projection worker unavailable | Domain status remains pending propagation; authoritative state unchanged |
| Notification provider unavailable | Delivery remains queued/retryable; lead and alert state remain durable |
| TAH remote storage unavailable | Last valid ready cartridge or explicit degraded retrieval with provenance |
| Jamie model unavailable | Deterministic fallback and human handoff; never fabricated listing inventory |
| Realtime socket unavailable | Fetch authoritative state on reconnect; socket remains invalidation signal only |

## Daily risk review

At standup and before merge:

1. Re-score risks whose earliest signal occurred.
2. Add new risks from test failures and migration data.
3. Name one owner for every exposure 12+.
4. Confirm mitigations exist in code/tests, not only this document.
5. Check that schedule cuts did not remove a non-negotiable boundary.
6. Record whether any abort criterion was approached or triggered.

## Go/no-go questions

Release is `no-go` if any answer is not a demonstrated yes:

- Can the server prove which tenant owns the exact host in this environment?
- Can Tenant A's authenticated browser be shown unable to read Tenant B directly?
- Can every anonymous listing field be traced to an allow-list decision?
- Can domain projection be rebuilt from Supabase without trusting current Edge state?
- Can an in-flight rollout be disabled without destructive schema rollback?
- Can operators see stale revisions, expired leases, dead letters, and resolver failures?
- Can the team explain every file in the PR and every known test skip?
