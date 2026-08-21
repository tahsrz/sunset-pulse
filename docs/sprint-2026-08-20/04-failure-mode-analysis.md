# Failure-Mode Analysis

## Severity model

- Critical: possible cross-tenant disclosure, unauthorized mutation, or notification to the wrong tenant.
- High: valid tenant unavailable, duplicated external side effect, or unrecoverable operational drift.
- Medium: delayed propagation, stale display, or recoverable operator burden.
- Low: cosmetic or diagnostic degradation.

## Tenant and projection failures

| Failure | Severity | Immediate behavior | Detection | Recovery |
|---|---|---|---|---|
| Supabase domain commit succeeds; outbox insert fails | Critical | Must be impossible through one transaction | Transaction error | Roll back entire mutation |
| Supabase commit succeeds; Edge write fails | Medium | New domain remains unavailable; revoked domain remains blocked by server | Projection lag metric and retryable job | Retry with backoff; reconcile |
| Edge write succeeds; completion update fails | Medium | Edge may be current while projection table looks stale | Edge version differs from applied revision | Idempotently reapply or verify then complete |
| Worker crashes after remote success | Medium | Same as above | Expired processing lease | Reclaim; compare desired manifest before write |
| Revision 14 retries after revision 16 | High | Must not overwrite revision 16 | Revision comparison | Mark 14 superseded |
| Two domain updates race | High | One writer must conflict | CAS conflict metric | Reload latest revision and resubmit intentionally |
| Full reconciliation overlaps mutation | Medium | Reconciler may read adjacent revisions | Snapshot revision or final compare | Enqueue latest revision only |
| Edge manifest unavailable | Medium | Platform subdomains may route deterministically; custom domains fail closed | Edge read errors | Serve generic 503/404; retry; server remains authoritative |
| Supabase unavailable | High | Tenant context cannot be authorized | Dependency error metric | Return 503; do not trust projection alone |
| Cached context says active after suspension | Critical | Server could render suspended tenant | Revision mismatch/invalidations | Sensitive reads revalidate; purge tags |
| Negative cache survives domain activation | Medium | Temporary 404 | Negative-hit age | Short TTL and mutation invalidation |
| Reassigned domain has stale old edge mapping | Critical if unverified | Server must reject path/candidate mismatch | Domain-owner mismatch event | 404 until projection catches up |
| Duplicate domain rows exist | Critical | Resolution ambiguous | `maybeSingle`/unique violation | Fail closed and repair data |
| Custom-domain verification expires | High | Potential takeover | Verification-age monitor | Suspend domain and require re-verification |

## Public inventory failures

| Failure | Severity | Immediate behavior | Detection | Recovery |
|---|---|---|---|---|
| Public route calls unrestricted listing helper | Critical | Private listing may leak | Static import test/code review | Make unrestricted helper internal and rename |
| Canonical source unavailable; Mongo fallback returns private row | Critical | Must still apply public policy | Negative route fixture | Enforce policy in fallback repository |
| Tenant allowlist absent | High | Empty tenant inventory | Empty-inventory metric | Agent config repair; never global fallback |
| Tenant A requests Tenant B listing | Critical | 404 | Isolation rejection metric | No recovery required; expected defense |
| Listing assignment changes while cached | High | Stale visibility | Assignment revision mismatch | Invalidate tenant/listing cache tags |
| Legacy and canonical rows disagree | High | Wrong public status or price | Sampled discrepancy job | Canonical wins; queue reconciliation |
| Listing coordinates missing | Medium | Recon unavailable | Coordinate rejection event | Return typed unavailable response |
| Public projection accidentally gains private field | Critical | PII/internal remarks leak | Snapshot/schema allowlist test | Remove field, purge cache, incident review |

## Lead and notification failures

| Failure | Severity | Immediate behavior | Detection | Recovery |
|---|---|---|---|---|
| Browser submits another agent ID | Critical | Server ignores/rejects it | Authority mismatch event | Use TenantContext identity |
| Duplicate lead submission | Medium | Return accepted duplicate | Idempotency conflict metric | No duplicate side effect |
| Lead insert succeeds; notification intent fails | High | Lead exists without alert | Transaction/outbox gap | Insert notification intent transactionally or reconcile |
| Provider times out before message ID | High | `unknown_delivery`; do not blind resend | Timeout classification | Reconcile/provider search/manual decision |
| Provider succeeds; DB completion fails | High | Delivery appears retryable | Stale processing plus provider metadata | Verify using provider ID when available |
| Notification update affects zero rows | High | UI may claim success falsely | Affected-row assertion | Return conflict/not found |
| Alert event metadata names wrong tenant | Critical | Wrong agent alert | Enrichment ownership mismatch | Resolve lead/agent server-side; suppress event |

## TAH and crawler failures

| Failure | Severity | Immediate behavior | Detection | Recovery |
|---|---|---|---|---|
| Partial cartridge upload | High | Hydrator must reject checksum | Manifest/checksum failure | Keep previous ready version |
| Cold hydration times out | Medium | Retrieval reports unavailable or uses defined fallback | Hydration latency/error | Retry next invocation; do not poison warm state |
| Process heartbeat stale | Medium | Terminal shows stale, not merely stopped | Heartbeat age | Restart task; inspect checkpoint |
| Checkpoint write races article completion | High | Duplicate/skip risk | Sequence anomaly | Atomic checkpoint after durable article commit |
| TAH hit receives unjustified score 1.0 | Medium | Poor ranking dominance | Score distribution metric | Calibrate confidence components |
| Remote and local cartridges differ | High | Non-reproducible answers | Version/checksum telemetry | Pin manifest version per query |

## Audio failures

| Failure | Severity | Immediate behavior | Detection | Recovery |
|---|---|---|---|---|
| Recognition object recreated on rerender | High product impact | Microphone indicator flickers | Lifecycle counter | Persistent coordinator |
| TTS and recognition overlap | High product impact | Echo/restart loop | State transition trace | Explicit speaking/interruption transitions |
| Stale callback fires after shutdown | Medium | UI state resurrects | Generation token mismatch | Ignore stale generation |
| Recognition restart hangs | Medium | Stuck `restarting` | Watchdog | Destroy and rebuild instance once |

## Required chaos tests

- Fail Edge Config after Supabase commit.
- Crash projection worker after successful remote write.
- Run two projection workers against the same batch.
- Suspend a tenant while a cached page request is in flight.
- Reassign a custom domain while an older projection job waits.
- Disable canonical listing reads and assert Mongo fallback remains public-safe.
- Force provider timeout and assert `unknown_delivery`, not immediate resend.
- Corrupt cartridge checksum and assert previous cartridge remains active.

