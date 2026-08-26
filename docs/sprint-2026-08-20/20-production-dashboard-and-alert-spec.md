# Production Dashboard and Alert Specification

Observability must answer operational decisions: Is tenant resolution safe? Is public inventory consistent? Is the domain projection converging? Is TAH ready and useful? Metrics and logs that cannot drive one of those decisions do not belong in the initial rollout.

## Telemetry principles

- Structured events use a versioned schema.
- Public hostnames, emails, phone numbers, message text, prompts, listing remarks, verification tokens, provider payloads, and session IDs are not metric labels.
- Stable identifiers are hashed with an environment-specific keyed hash when correlation is needed.
- Raw error objects are normalized to enumerated categories before emission.
- Metrics are low-cardinality; high-cardinality correlation belongs in sampled structured logs/traces.
- Security events are emitted before public error mapping removes diagnostic detail.
- Event emission failure never weakens authorization or changes a denied result into an allowed result.

## Common event envelope

```ts
interface PlatformEventEnvelope<TName extends string, TData> {
  schemaVersion: 1;
  name: TName;
  occurredAt: string;
  environment: 'production' | 'preview' | 'development';
  deploymentId?: string;
  gitSha?: string;
  requestId?: string;
  traceId?: string;
  tenantHash?: string;
  siteHash?: string;
  actorClass: 'anonymous' | 'consumer' | 'tenant_owner' | 'operator' | 'service' | 'unknown';
  data: TData;
}
```

`requestId` and `traceId` must be random operational IDs, never raw visitor session IDs.

## Event: `tenant.resolution`

```ts
interface TenantResolutionData {
  result:
    | 'resolved'
    | 'invalid_host'
    | 'unknown_domain'
    | 'wrong_environment'
    | 'pending_verification'
    | 'pending_propagation'
    | 'suspended'
    | 'revoked'
    | 'stale_projection'
    | 'configuration_error'
    | 'dependency_error';
  hostClass: 'platform' | 'custom' | 'local' | 'preview' | 'reserved' | 'unknown';
  source: 'database' | 'edge_candidate_database_confirmed' | 'request_cache';
  durationMs: number;
  domainRevision?: number;
  projectionRevision?: number;
  requestCacheHit: boolean;
  publicStatus: 200 | 404 | 503;
}
```

Never emit the raw host as a metric label. A sampled redacted trace may include a keyed hostname hash.

Metrics:

- `tenant_resolution_total{result,host_class,source,environment}`
- `tenant_resolution_duration_ms{source,environment}` histogram
- `tenant_resolution_cache_hit_total{environment}`
- `tenant_resolution_revision_mismatch_total{environment}`

## Event: `public_inventory.decision`

```ts
interface PublicInventoryDecisionData {
  surface:
    | 'list'
    | 'search'
    | 'advanced_search'
    | 'detail'
    | 'rent'
    | 'recon'
    | 'featured'
    | 'hot_list'
    | 'value_guess'
    | 'location_guess'
    | 'tenant_page'
    | 'jamie_context';
  decision:
    | 'included'
    | 'not_found'
    | 'private'
    | 'suppressed'
    | 'deleted'
    | 'demo'
    | 'unassigned'
    | 'assignment_expired'
    | 'tenant_unavailable'
    | 'invalid_source'
    | 'licensing_restricted';
  source: 'supabase' | 'mongo_compatibility' | 'mock';
  listingHash?: string;
  policyVersion: string;
  projectionVersion: string;
  durationMs: number;
}
```

Metrics:

- `public_inventory_decisions_total{surface,decision,source,environment}`
- `public_inventory_duration_ms{surface,source,environment}`
- `public_inventory_schema_failure_total{surface,source,environment}`
- `public_inventory_legacy_source_total{surface,environment}`

Do not alert on ordinary private/unassigned denials alone. Alert on sudden ratios, schema failures, or cross-tenant invariant failures.

## Event: `tenant.security_invariant`

```ts
interface TenantSecurityInvariantData {
  invariant:
    | 'host_context_mismatch'
    | 'cross_tenant_repository_result'
    | 'cross_tenant_mutation_attempt'
    | 'private_projection_field'
    | 'unauthorized_global_fallback'
    | 'environment_crossover'
    | 'service_client_in_browser'
    | 'projection_authority_conflict';
  outcome: 'blocked' | 'detected_after_response' | 'test_only';
  surface: string;
  candidateTenantHash?: string;
  authoritativeTenantHash?: string;
}
```

Every production event with `outcome = detected_after_response` is a security incident. `blocked` events are high-signal alerts when nonzero outside controlled testing.

## Event: `domain_projection.job`

```ts
interface DomainProjectionJobData {
  operation: 'upsert' | 'remove' | 'rebuild' | 'reconcile';
  transition:
    | 'claimed'
    | 'succeeded'
    | 'retry_scheduled'
    | 'superseded'
    | 'dead_lettered'
    | 'lease_recovered'
    | 'unknown_remote_state';
  targetRevision: number;
  desiredRevision?: number;
  observedRevision?: number;
  attempt: number;
  durationMs?: number;
  errorCode?: string;
  driftAgeSeconds?: number;
}
```

Metrics:

- `domain_projection_jobs_total{operation,transition,environment}`
- `domain_projection_job_duration_ms{operation,environment}`
- `domain_projection_drift_age_seconds{environment}`
- `domain_projection_pending{state,environment}`
- `domain_projection_expired_leases_total{environment}`
- `domain_projection_dead_letters{environment}`

## Event: `rls.authorization_probe`

This event is emitted by integration/release probes, not every database request.

```ts
interface RlsProbeData {
  testId: string;
  table: string;
  actorFixture: 'anonymous' | 'owner_a' | 'owner_b' | 'operator' | 'consumer';
  operation: 'select' | 'insert' | 'update' | 'delete' | 'rpc';
  expected: 'allow' | 'deny';
  actual: 'allow' | 'deny' | 'error';
}
```

Any `expected !== actual` blocks release.

## Event: `tah.retrieval`

```ts
interface TahRetrievalData {
  readiness: 'ready' | 'cold_hydrating' | 'missing_manifest' | 'invalid_manifest' | 'unavailable';
  source: 'local_cartridge' | 'remote_cartridge' | 'crawler_pending' | 'web_fallback' | 'none';
  result: 'hit' | 'miss' | 'degraded' | 'error';
  durationMs: number;
  hydrationDurationMs?: number;
  checkpointAgeSeconds?: number;
  candidateCount: number;
  returnedCount: number;
  confidenceBand?: 'low' | 'medium' | 'high';
  cartridgeRevisionHash?: string;
}
```

Metrics:

- `tah_readiness_total{readiness,environment}`
- `tah_retrieval_total{source,result,environment}`
- `tah_retrieval_duration_ms{source,environment}`
- `tah_hydration_duration_ms{environment}`
- `tah_checkpoint_age_seconds{environment}`
- `tah_zero_result_total{source,environment}`

## Dashboard 1: Tenant Safety

Audience: platform, security, on-call.

Panels:

1. Resolution requests and success ratio by environment/host class.
2. Invalid/unknown/wrong-environment outcomes over time.
3. Revision mismatch and authoritative conflict count.
4. Security invariant events with outcome and surface.
5. Resolver latency p50/p95/p99 split by source and cache hit.
6. Public 404/503 rate for tenant routes versus baseline.
7. RLS release-probe status by test ID.
8. Recent deployments and flag changes annotated on charts.

Primary decisions:

- continue or abort canary
- disable tenant route allow-list
- investigate proxy/host change
- declare tenant-isolation incident

## Dashboard 2: Domain Projection Operations

Audience: platform operations.

Panels:

1. Desired/applied/observed revision convergence.
2. Pending/retryable/processing/superseded/dead-letter counts.
3. Oldest drift age and propagation duration percentiles.
4. Expired leases and recovery rate.
5. Attempt distribution and top normalized error codes.
6. Manifest digest by environment and last successful rebuild.
7. Reconciliation differences: missing, stale, extra, malformed.
8. Worker executions, duration, batch size, and no-op rate.

Primary decisions:

- pause writer
- replay or dead-letter a job
- run full reconciliation/rebuild
- keep domain in pending propagation

## Dashboard 3: Public Inventory Integrity

Audience: inventory/data, product, security.

Panels:

1. Include/exclude decisions by surface and policy reason.
2. Schema/projection failures.
3. Legacy Mongo compatibility usage by surface.
4. Tenant unassigned/expired denials.
5. Source latency and error rate.
6. Cross-surface sampled consistency checks.
7. Coordinate policy distribution: exact/fuzzed/omitted.
8. Policy/projection version adoption after deployment.

Primary decisions:

- stop a route migration
- inspect provider/licensing feed
- prioritize legacy source retirement
- detect tenant assignment backfill gap

## Dashboard 4: TAH Knowledge Readiness

Audience: AI platform, crawler operations.

Panels:

1. Current cartridge revision and ready-manifest status.
2. Crawler checkpoint age and ingest rate.
3. Cold hydration count/duration/failure.
4. Warm retrieval latency and hit/miss ratio.
5. Web fallback and crawler-pending usage.
6. Confidence bands and zero-result rate.
7. Jamie/Command Center/other consumer usage split.
8. Last-known-good cartridge age.

Primary decisions:

- restart/repair crawler
- retain last-known-good cartridge
- invoke bounded web fallback
- block a broken cartridge revision

## Alert catalog

| Alert | Initial condition | Severity | First action | Owner |
|---|---|---|---|---|
| Tenant context mismatch | any production `host_context_mismatch` | critical | disable affected route allow-list; preserve trace | security/platform |
| Cross-tenant result | any production detection | critical | stop rollout and invoke incident runbook | security |
| Environment crossover | any production event | critical | disable resolver in affected environment | platform |
| Private projection field | any schema/snapshot runtime guard | critical | disable affected public route | inventory/security |
| Resolver dependency outage | 503 ratio >5% for 5 min, traffic floor met | high | inspect Supabase/cache and consider deliberate maintenance response | platform |
| Resolver p95 regression | >200 ms for 10 min after baseline acceptance | medium | inspect source/cache/query plan | platform |
| Domain drift stale | oldest production drift >10 min | high | pause activation, inspect worker/outbox | operations |
| Projection dead letter | count >0 production | high | inspect job and authoritative revision | operations |
| Expired projection leases | >0 after two worker intervals | medium | run repair and inspect worker health | operations |
| Public schema failure | >0 production | high | disable route migration group | inventory |
| Legacy inventory usage | does not decline according to rollout target | low | find unmigrated surface | inventory |
| TAH invalid manifest | any active revision | high | retain last-known-good and block revision | AI platform |
| TAH checkpoint stale | age >24 h | medium | inspect crawler/checkpoint service | crawler owner |
| TAH retrieval p95 | >200 ms warm for 15 min after baseline | medium | inspect storage/index/cache | AI platform |

Thresholds are initial hypotheses. Calibrate after one week without relaxing invariant alerts.

## Atlas operations surface

Add an authenticated section to the existing Atlas process terminal, not a public endpoint.

Required rows:

- tenant domain registry status by hashed domain/reference
- authoritative revision
- desired projection revision
- applied projection revision
- observed Edge revision/digest
- propagation state and age
- attempt/error category
- last reconciliation timestamp

Required actions:

- inspect redacted job detail
- retry a retryable/dead-letter job with audit reason
- enqueue reconciliation
- request full environment rebuild with confirmation
- copy correlation/request ID

The UI must never permit changing tenant ownership by editing projected state. Ownership mutations go through the authoritative domain operation.

## Cardinality budget

Allowed metric labels:

- environment
- result/decision/state
- surface from fixed enum
- source from fixed enum
- operation/transition
- host class
- error code from controlled enum

Forbidden metric labels:

- tenant/site/listing/user/session/request IDs
- hostnames/domains
- URLs or route parameters
- provider messages
- arbitrary exception names/messages
- Git SHA if the backend cannot bound active series; deployment annotation is preferred

High-cardinality values may appear only in sampled structured logs with retention/access controls.

## Retention and privacy

- Security audit/release evidence follows the security retention policy.
- Routine resolver/inventory traces use short operational retention and sampling.
- Error sampling increases temporarily during canary without capturing payloads.
- Hash keys rotate deliberately; rotation effects on correlation are documented.
- A deletion/privacy request must not require preserving raw visitor identifiers in telemetry.

## Canary decision board

During rollout, keep one compact view with:

- deployment and flag stage
- requests and traffic share
- tenant resolution success/404/503
- invariant alerts
- p95 latency
- public inventory schema failures
- cross-surface comparison mismatches
- domain projection drift
- rollback control owner/status

The release owner records a decision at each stage: continue, hold, rollback, or declare incident. Absence of a critical alert is necessary but not sufficient; the required probes must also pass.

