# Production Observability Design

## Objectives

Observability must answer:

- Which tenant did the system resolve, and why?
- Did a request fail closed or accidentally fall back?
- Is Edge Config behind Supabase?
- Did a private listing attempt reach a public surface?
- Did a lead or alert cross an ownership boundary?
- Is an external side effect pending, delivered, failed, or unknown?
- Is the crawler alive, progressing, and publishing valid cartridges?
- Is retrieval warm, cold, stale, grounded, or falling back?

## Event envelope

```ts
type PlatformEvent = {
  eventName: string;
  occurredAt: string;
  environment: 'production' | 'preview' | 'development';
  requestId?: string;
  traceId?: string;
  route?: string;
  outcome: 'success' | 'rejected' | 'degraded' | 'failed';
  reasonCode?: string;
  latencyMs?: number;
  tenantRef?: string;
  agentRef?: string;
  domainRef?: string;
  listingRef?: string;
  revision?: number;
  attributes?: Record<string, string | number | boolean | null>;
};
```

Refs are stable keyed hashes or non-sensitive internal IDs according to policy. Metric labels must remain low cardinality; individual tenant/domain refs belong in logs/traces, not metric dimensions.

## Required events

### Tenant resolution

- `tenant_resolution_succeeded`
- `tenant_resolution_rejected`
- `tenant_domain_ambiguous`
- `tenant_host_path_mismatch`
- `tenant_internal_header_spoof_ignored`
- `tenant_entitlement_blocked`
- `tenant_context_cache_hit`
- `tenant_context_cache_stale`

Attributes:

- domain kind
- resolution source
- environment
- cache tier
- domain revision
- publication state
- rejection reason

Never log raw query parameters, cookies, authorization headers, or complete custom-domain verification tokens.

### Domain projection

- `domain_projection_enqueued`
- `domain_projection_claimed`
- `domain_projection_succeeded`
- `domain_projection_retryable`
- `domain_projection_superseded`
- `domain_projection_dead_lettered`
- `domain_projection_reconciled`

Metrics:

- desired minus applied revision
- projection age in seconds
- ready queue depth
- stale processing count
- dead-letter count
- attempt distribution
- remote write latency

### Public inventory

- `public_listing_resolved`
- `public_listing_rejected`
- `tenant_listing_assignment_rejected`
- `legacy_listing_fallback_used`
- `listing_source_discrepancy`
- `public_projection_validation_failed`
- `recon_coordinates_unavailable`

Reason codes distinguish private, demo, deleted, wrong tenant, invalid status, missing media, missing coordinates, and source unavailable.

### Leads and notifications

- `lead_ingestion_accepted`
- `lead_ingestion_duplicate`
- `lead_authority_mismatch_rejected`
- `alert_enrichment_mismatch_suppressed`
- `notification_delivery_claimed`
- `notification_delivery_succeeded`
- `notification_delivery_unknown`
- `notification_delivery_dead_lettered`
- `notification_mutation_zero_rows`

Do not log lead name, email, phone, message body, or full listing address. Use lead ID or keyed hash.

### TAH and crawler

- `crawler_heartbeat_received`
- `crawler_checkpoint_advanced`
- `crawler_checkpoint_stale`
- `cartridge_publish_started`
- `cartridge_publish_succeeded`
- `cartridge_checksum_rejected`
- `atlas_hydration_cold`
- `atlas_hydration_succeeded`
- `atlas_hydration_failed`
- `tah_retrieval_completed`
- `tah_retrieval_fallback`

Metrics:

- checkpoint age
- articles completed per hour
- cartridge publication lag
- active manifest age
- cold hydration latency
- warm retrieval latency
- results per query
- no-result rate
- web fallback rate
- provenance-present rate
- confidence distribution

Separate static and volatile sources before measuring freshness.

## Initial dashboards

### Tenant safety

- Resolution success/rejection rate
- Rejections by reason
- Host/path mismatches
- Spoofed-header attempts
- Suspended/draft access attempts
- Cross-tenant listing/lead rejections

### Domain operations

- Desired versus applied revisions
- Oldest projection lag
- Queue by state
- Dead letters
- Reconciliation repairs
- Custom domains by lifecycle state

### Public inventory

- Global and tenant requests
- Public/private rejection rate
- Legacy fallback rate
- Canonical/legacy discrepancy count
- Public projection validation errors
- External rent/recon request volume and latency

### Notification operations

- Pending/processing/sent/failed/unknown/dead-lettered
- Oldest ready job
- Attempts per provider
- Duplicate suppression count
- Zero-row mutation count

### Knowledge operations

- Worker heartbeat and checkpoint
- Cartridge version/checksum
- Cold hydration success and latency
- Warm retrieval latency
- Grounded/no-result/fallback rates
- Result sources and confidence bands

## Alert thresholds

Treat these as initial operational triggers, not permanent SLO promises:

- Critical: any confirmed cross-tenant disclosure or wrong-tenant notification.
- Critical: active domain resolves to a tenant different from authoritative registry.
- High: projection dead letter exists for a suspension/reassignment.
- High: oldest projection lag exceeds 10 minutes.
- High: notification `unknown_delivery` for high-intent/tour event.
- High: public projection validation fails.
- Warning: projection lag exceeds 2 minutes.
- Warning: crawler heartbeat older than 2 expected intervals.
- Warning: checkpoint age exceeds 24 hours until a measured target replaces it.
- Warning: cold hydration failure rate exceeds baseline.
- Warning: legacy listing fallback or discrepancy rate rises materially above baseline.

## PII and secret policy

Never emit:

- email, phone, lead message, or full person name
- raw session ID or cookie
- exact residential address in general logs
- authorization headers
- API keys, tokens, or webhook signatures
- Stripe payloads
- Jamie memory or prompt content
- unredacted model inputs/outputs containing customer data

The existing Langfuse masking helper protects common secret-like keys, but tenant/lead observability should use structured summaries rather than relying only on recursive key-name masking.

## Retention

- Security/audit events: retention aligned with legal and operational policy.
- High-cardinality debug traces: short retention.
- Aggregated metrics: longer retention for baseline comparison.
- Raw AI content: opt-in and redacted; not part of tenant routing telemetry.

## Correlation

Generate one request ID at the ingress. Carry it through tenant resolution, listing resolution, lead insertion, alert projection, and outbox creation. External delivery uses a separate operation ID linked to the source event and idempotency key.

## Success criteria

- An operator can explain a tenant 404 without inspecting raw database rows.
- Projection drift is visible before a customer reports it.
- Every external message has a lifecycle state.
- Every TAH answer reports source/version provenance.
- Metrics do not contain unbounded hostname, tenant, lead, or listing labels.

