# Staging and Production-Gated Execution Plan

This plan covers the work that cannot be completed safely from the local checkout. It is documentation and release choreography only. No production data, remote migration, policy, Edge Config write, or provider notification should be performed until the stated gate is approved.

## Objective

Prove that TenantContext, public inventory, RLS, domain projection, TAH operations, and external side effects remain isolated and recoverable in an environment that has real identity and database behavior.

## Required access and participants

- A disposable scrubbed database or staging Supabase project with the reviewed schema.
- Separate anonymous, Tenant A, Tenant B, and operator credentials. Never reuse a service-role key in browser or RLS probes.
- A staging Edge Config or equivalent projection store.
- A staging deployment URL with request logs and trace IDs enabled.
- A named reviewer for schema, RLS policy, and rollback SQL.
- A release owner authorized to pause, roll back, and rotate secrets.

## Gate 0: Freeze the evidence set

Before any remote action:

1. Record branch SHA, migration inventory, environment name, schema dump hash, and deployment URL.
2. Confirm the dirty branch has been allocated in `24-worktree-allocation-ledger.md`.
3. Confirm no customer records or secrets will be copied into test evidence.
4. Export only aggregate query results and restricted hashes/IDs where needed.
5. Review the proposed `tenant_domains`, `domain_manifest_outbox`, `domain_manifest_projection`, and `tenant_listing_assignments` schema against `03`, `13`, `14`, and `19`.

**Stop if:** the schema differs from the adapter contract, the environment cannot provide two authenticated identities, or rollback ownership is unclear.

## Gate 1: Read-only database preflight

Run Q01-Q08 from `13-migration-rls-query-catalog.md` with a read-only operator connection.

Required outcomes:

- Migration versions are known and intentional.
- No duplicate normalized subdomains or custom domains.
- Ownerless or agent-less sites have an explicit disposition.
- Invalid hostname shapes are inventoried.
- Existing RLS and force-RLS status are recorded.
- Sensitive `site_config` columns are mapped against the public projection.

Save a timestamped aggregate report with counts, query duration, and pass/fail status. Do not save row contents in ordinary CI artifacts.

**Stop if:** Q05-Q08 produce unresolved identity/domain conflicts, expected tables are absent, or current policies allow cross-tenant reads.

## Gate 2: Rehearse schema and RLS changes

Apply the reviewed migration only to the disposable or staging database. Use a transaction where supported and capture the migration log.

Validate:

1. Backfill coverage with Q09-Q12.
2. Unique normalized-domain constraints.
3. Tenant/listing assignment ownership and lifecycle rules.
4. Anonymous public projection reads.
5. Tenant A cannot read Tenant B's site, lead, event, listing assignment, or operational outbox rows.
6. Tenant A can read only its assigned listings.
7. Operator/service-role paths remain explicit and do not become browser privileges.

The executable probes belong in the test catalog and must run through real HTTP/Supabase clients, not only an elevated SQL editor.

**Rollback:** restore the pre-migration schema snapshot or run the reviewed down/remediation script. Record whether any backfill rows were changed before rollback.

## Gate 3: TenantContext and domain projection drill

Use staging hosts for Tenant A, Tenant B, an unknown host, a revoked domain, and a preview hostname.

Test matrix:

- Exact host resolves the correct environment and tenant.
- Case, trailing-dot, port, and forwarded-host normalization behave identically.
- Browser-supplied `x-sunset-*` headers cannot select a tenant.
- A domain projection miss fails closed or degrades to a safe 404.
- A deleted/revoked domain cannot expose its previous tenant.
- Database success followed by projection failure creates a retryable outbox state.
- Replayed revisions collapse to the newest desired revision.
- Stale leases, dead letters, and reconciliation are observable.

Compare the authoritative database revision with the projection revision. Exercise one intentional projection failure in staging and verify recovery without duplicate or cross-tenant publication.

## Gate 4: Public inventory and RLS end-to-end proof

From an anonymous browser and both tenant identities:

1. Open a public listing on Tenant A's host.
2. Attempt the same listing from Tenant B's host.
3. Attempt private, demo, deleted, and unassigned listing IDs.
4. Exercise search, advanced search, discovery, detail, rent, recon, featured, hot-list, historical, and Kepler surfaces.
5. Assert the response contains only the `PublicListing` allow-list.
6. Assert no owner, seller, metadata, prompt, billing, or internal diagnostic fields appear.
7. Assert every view event carries the correct global session and tenant scope.

Capture status codes, response schema results, reason codes, and trace IDs. Never capture full response bodies containing personal data.

## Gate 5: TAH and crawler operational proof

Run the crawler and Atlas process against staging storage only.

- Publish a cartridge using a temporary file, checksum verification, and atomic rename.
- Confirm readers ignore incomplete files without a `.ready` manifest.
- Kill a hydration attempt mid-write and verify retry/recovery.
- Advance a checkpoint and verify heartbeat age and stale-checkpoint alerts.
- Measure cold hydration, warm retrieval, provenance presence, no-result rate, and web fallback rate.
- Verify TAH confidence ranking does not blindly dominate Swarm/HAT sources.

Minimum release targets from the sprint design:

- Hydration success >= 99.9%.
- Warm retrieval p95 < 200 ms.
- Maximum crawler checkpoint age <= 24 hours.

## Gate 6: External side effects and notification outbox

Use provider sandbox credentials and test recipients only.

1. Claim one notification with an atomic lease.
2. Force a provider timeout after submission.
3. Query the provider by idempotency key before retrying.
4. Confirm exactly-once provider behavior and correct `unknown` status handling.
5. Exercise stale lease recovery, retry backoff, and dead-lettering.
6. Verify tenant and agent routing in the notification payload without logging PII.

No real SMS/email/push recipient is allowed during this drill.

## Gate 7: Release, canary, and rollback

Promote only after Gates 1-6 are signed off.

- Deploy the reviewed schema and application in the documented order.
- Start with one canary tenant and read-only projection behavior.
- Monitor tenant rejection, cross-tenant denial, projection lag, public projection failures, TAH hydration, and notification unknown states.
- Keep the previous application deployment and database rollback/remediation path available.
- Roll back immediately on any cross-tenant read, private-field response, ambiguous domain, or duplicate external side effect.

The release record must include evidence links, approvers, timestamps, migration versions, dashboard snapshots, and unresolved risks.

## Completion criteria

This blocked portion is complete only when:

- Q01-Q12 pass or have reviewed dispositions.
- Real anonymous and two-identity RLS probes pass.
- TenantContext resolution and projection failure drills pass.
- Public inventory end-to-end responses pass schema and isolation checks.
- TAH SLO evidence exists from staging runs.
- Provider sandbox idempotency and recovery are proven.
- Release and rollback owners sign the handoff.

Until then, local tests and builds are evidence of code health only; they are not evidence of tenant isolation or production readiness.
