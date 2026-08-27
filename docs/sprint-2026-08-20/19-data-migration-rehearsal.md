# Data Migration Rehearsal

This runbook proves that domain and listing-assignment backfills are deterministic, repeatable, and recoverable before production mutation. It supplements the release runbook; it does not authorize a production database change.

## Rehearsal outputs

Every rehearsal produces:

```text
migration-rehearsal/
  manifest.json
  preflight-counts.json
  normalized-domain-candidates.jsonl
  domain-conflicts.jsonl
  assignment-candidates.jsonl
  assignment-conflicts.jsonl
  skipped-records.jsonl
  postflight-counts.json
  query-plans/
  test-result-manifest.json
  operator-notes.md
```

Artifacts containing IDs or customer data belong in restricted storage and must not be committed. The GitHub PR receives only aggregate counts, hashes, schema version, and redacted examples.

## Manifest contract

```json
{
  "rehearsalId": "uuid",
  "environment": "local|staging|production-dry-run",
  "sourceSnapshotId": "provider-specific-id-or-hash",
  "sourceCapturedAt": "ISO-8601",
  "gitSha": "sha",
  "migrationVersion": "timestamp_name",
  "normalizerVersion": "sha256",
  "policyVersion": "sha256",
  "startedAt": "ISO-8601",
  "completedAt": "ISO-8601",
  "operator": "role-or-id",
  "dryRun": true,
  "candidateCounts": {},
  "conflictCounts": {},
  "outputDigest": "sha256"
}
```

The same source snapshot, Git SHA, and policy versions must produce the same output digest.

## Rehearsal sequence

### R0: Static migration review

Before a database starts:

1. Review every new table, index, constraint, grant, policy, function, trigger, and `security definer` search path.
2. Confirm migration ordering relative to the untracked lead-idempotency migration.
3. Run a SQL parser/linter if available.
4. Verify repeat application behavior in a disposable database.
5. Verify down/rollback strategy is feature-flag based and does not require dropping forensic state.

Exit gate: ADR-017 through ADR-019 are reflected consistently in the SQL and candidate schema.

### R1: Empty database reconstruction

Purpose: prove migration history can build the target schema from zero.

Procedure:

1. Create a disposable local Supabase database.
2. Apply the complete migration history in repository order.
3. Assert all expected tables/functions/policies exist.
4. Run DBR-001 through DBR-011 and RLS-001 through RLS-014.
5. Apply the candidate migration a second time only where idempotency is intended; otherwise prove the migration ledger prevents replay.

Exit gate: clean reconstruction, no hidden dependency on manual dashboard SQL.

### R2: Synthetic adversarial dataset

Seed intentionally difficult rows:

- uppercase/trailing-dot domains
- exact normalized duplicate domains
- same hostname in different environments
- custom domain without verification evidence
- ownerless site
- missing agent ID
- site with both platform and custom domain
- suspended/revoked site with stale projected state
- listing aliases that collide across providers
- co-listed canonical listing
- private listing accidentally named in legacy allow-list
- expired and duplicate assignment candidates
- leads/events with missing or conflicting site/agent identity

Run the dry backfill. Expected:

- valid candidates are deterministic
- collisions and ambiguous ownership are emitted to conflict artifacts
- unsafe listing candidates are skipped
- no source row is silently dropped from candidate + conflict + skipped accounting

Accounting invariant:

```text
source rows considered
  = accepted candidates
  + conflicts
  + policy skips
  + structurally invalid rows
```

Exit gate: every adversarial row reaches its expected bucket.

### R3: Production-like staging snapshot

Purpose: measure actual shape, volume, conflicts, and query plans without production mutation.

Requirements:

- sanitized snapshot with referential shape and representative volume
- same extensions and Postgres version as production
- production-like indexes and RLS
- no real secrets, verification tokens, message bodies, or provider credentials

Procedure:

1. Run Q01-Q08 and save aggregate results.
2. Execute dry candidate extraction twice.
3. Compare candidate/conflict/skipped digests.
4. Apply schema and backfill in a transaction or disposable clone.
5. Run Q09-Q18, DBR/RLS suites, and query plans.
6. Exercise feature flags through off, shadow, canary, and rollback states.
7. Measure lock time, statement duration, table growth, and cache invalidation.

Exit gate: deterministic digests, acceptable plans, zero unexplained conflicts, and successful rollback drill.

### R4: Production read-only dry run

Purpose: detect drift between the staging snapshot and current production just before release.

Procedure:

1. Verify approved maintenance/release window and operator roles.
2. Run only Q01-Q08 plus versioned candidate selection in read-only mode.
3. Write artifacts outside the database to restricted storage.
4. Compare aggregate counts and digests to R3.
5. Recalculate lock/runtime estimate using production statistics without running mutating statements.

Hard stop:

- new normalized collision
- ownership ambiguity
- unexpected direct-client dependency
- source row count change outside agreed tolerance
- migration version mismatch
- query plan regression

## Domain candidate algorithm

For each `site_config` row:

1. Read stable site, owner, agent, status, subdomain, and custom-domain fields.
2. Determine environment from explicit source/configuration, never hostname guess alone.
3. Normalize hostname with the exact application normalizer version.
4. Validate syntax, reserved names, lifecycle, and verification evidence.
5. Build candidate keyed by `(environment, normalized_hostname)`.
6. Group candidates by key.
7. Accept groups with one authoritative owner relation.
8. Emit every other group as a conflict; do not choose newest, oldest, active, or non-null heuristically.
9. Derive initial domain revision and desired projection revision deterministically.

Candidate row includes:

```text
source_site_id (also the phase-one tenant scope UUID)
agent_id
normalized_hostname
environment
kind
status
verified_at (when permitted)
source_updated_at
candidate_reason
normalizer_version
```

Verification tokens are never exported.

## Listing assignment candidate algorithm

For each legacy publication/hot-list/site-listing reference:

1. Resolve source identifier through the canonical listing alias repository.
2. Require exactly one canonical listing ID.
3. Resolve the authoritative `site_config.id` tenant scope UUID.
4. Determine purpose from an enumerated source mapping.
5. Validate canonical listing exists; do not require it to be currently public merely to store historical assignment, but mark publication eligibility separately.
6. Derive lifecycle timestamps from explicit source fields only.
7. Group by `(site_config_id, canonical_listing_id, purpose, active lifecycle)`.
8. Collapse exact duplicate source references with provenance count.
9. Emit ambiguous aliases, missing tenants, and contradictory lifecycle as conflicts.

Public visibility after migration remains:

```text
canonical_public_eligibility
AND active_tenant_assignment
AND active_tenant/domain/publication
```

The backfill cannot make an internal listing public by itself.

## Chunking and lock strategy

- Schema DDL is separated from data backfill where locking risk warrants it.
- Build large indexes concurrently in an allowed nontransactional migration stage when supported.
- Process deterministic primary-key ranges, not offset pagination.
- Keep each batch bounded by measured duration and row count.
- Persist an audited cursor/checkpoint for restart.
- Use insert/upsert conflict behavior only on the exact natural key and revision contract.
- Do not hold locks while calling Edge Config or any remote provider.

Initial batch size is selected from R3 measurement, not guessed. Reduce when replication lag, lock wait, or statement duration crosses the release threshold.

## Backfill state machine

```text
planned
  -> preflight_passed
  -> running
  -> paused | failed | completed
  -> verified
  -> released
```

Required checkpoint fields:

- migration/rehearsal ID
- source snapshot/version
- cursor start/end
- batch number
- rows considered/accepted/skipped/conflicted
- transaction start/end
- output digest
- error category
- operator/worker ID

A retry of a completed batch must be a no-op or produce the same rows/revision.

## Reconciliation after write

Compare independent views:

1. Source legacy domain/publication records.
2. Candidate artifact generated before write.
3. Authoritative new tables after write.
4. Public service behavior through fixture/sampled route probes.
5. Edge desired/applied/observed projection after the worker is enabled.

Required classes:

- missing target
- unexpected target
- field mismatch
- revision mismatch
- lifecycle mismatch
- identity mismatch
- public behavior mismatch

Identity mismatch is always release-blocking.

## Rollback rehearsal

Prove all of these before production:

1. New resolver flag off returns to an equally safe existing route or deliberate unavailable response.
2. Public inventory route flags can revert independently.
3. Tenant assignment consumption can be disabled without deleting assignments.
4. Edge worker can stop while desired state remains durable.
5. Restrictive RLS migration rollback does not require restoring unsafe public/global policies.
6. Backfill rows can remain inert and inspected after traffic rollback.

If safe legacy behavior does not exist for a tenant route, rollback is a 404/maintenance response, not a data-leaking fallback.

## Production write authorization packet

Before approval, present:

- Git SHA and exact migration files
- R3 and R4 manifests/digest comparison
- all conflict counts and dispositions
- expected rows/index size/runtime/lock behavior
- test result manifest
- feature flag initial state and dependency order
- named operator, observer, database owner, and security reviewer
- dashboard and alert links
- rollback command/flag sequence
- customer-impact communication threshold

## Completion criteria

- Candidate extraction is deterministic across two runs.
- Every source row is accounted for.
- No conflict is resolved by an undocumented heuristic.
- New rows satisfy constraints and RLS.
- Query plans meet targets at representative volume.
- Public behavior is unchanged until its explicit flag enables.
- Rollback drill succeeds without destructive DDL or unsafe policies.
- Restricted artifacts are retained according to the security policy and excluded from Git.
