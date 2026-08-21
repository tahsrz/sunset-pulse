# Architecture Decisions and Review Gates

This register prevents the sprint from repeatedly reopening settled boundaries while still making unresolved product and infrastructure choices visible. A change to an accepted decision requires a short ADR update, named owner, and explicit effect on the threat model and regression matrix.

## Accepted decisions

### ADR-001: Resolution, authorization, and entitlement are separate

- Status: accepted
- Decision: `TenantContext` identifies scope; authorization decides whether the actor may perform an operation; entitlement decides whether the tenant has purchased/enabled the capability.
- Consequence: `tenantId` or `agentId` presence never proves permission.
- Review test: every protected service receives an actor/capability decision in addition to tenant context.

### ADR-002: API scope is derived from the validated request host

- Status: accepted
- Decision: API routes call `resolveTenantContext(request)` and do not trust browser-supplied tenant headers or body fields.
- Consequence: middleware rewrites may optimize pages but are not an API security dependency.
- Review test: forged `x-sunset-tenant`, `x-forwarded-host`, `tenantId`, and `agentId` inputs cannot change resolution.

### ADR-003: Host resolution is exact and environment-scoped

- Status: accepted
- Decision: normalized hostnames match exact `(environment, hostname)` registry rows. No suffix, substring, wildcard, or production-to-preview fallback is allowed.
- Consequence: `<slug>.localhost` is represented as development data rather than a bypass flag.
- Review test: malformed ports, trailing dots, mixed case, comma-separated hosts, preview aliases, and deceptive suffixes fail closed.

### ADR-004: Supabase is authoritative; Edge Config is a disposable projection

- Status: accepted
- Decision: the database owns domain lifecycle and revision. Edge Config is rebuilt from desired database state.
- Consequence: projection drift may briefly return 404, but the server resolver still prevents cross-tenant exposure.
- Review test: stale, missing, and malicious manifest entries cannot override the authoritative tenant/site/revision relation.

### ADR-005: Domain projection uses a transactional outbox

- Status: accepted
- Decision: domain mutation, desired revision, and outbox insertion commit atomically. A leased worker applies the latest revision and supersedes obsolete jobs.
- Consequence: there is no distributed transaction with Edge Config.
- Review test: database commit plus remote failure converges through retry/reconciliation without duplicate or stale activation.

### ADR-006: Request-local resolver caching stores the in-flight Promise

- Status: accepted
- Decision: a module-private `WeakMap<Request, Promise<TenantResolution>>` deduplicates lookups within one request.
- Consequence: simultaneous callers await one resolution and garbage collection follows request lifetime.
- Review test: concurrent resolver calls perform one authoritative lookup; rejected promises cannot poison later requests.

### ADR-007: Rich context is passed explicitly

- Status: accepted
- Decision: services accept `TenantContext` or a narrower derived scope as an argument. Do not introduce AsyncLocalStorage in this sprint.
- Consequence: dependencies remain visible in signatures and tests.
- Review test: code review rejects ambient tenant reads inside repositories and policy helpers.

### ADR-008: Public inventory has a separate output contract

- Status: accepted
- Decision: anonymous routes return `PublicListing`, not the internal `Listing` object with fields omitted ad hoc.
- Consequence: public fields are allow-listed and sensitive additions to `Listing` do not leak automatically.
- Review test: internal owner, seller, lockbox, private remarks, arbitrary metadata, raw provider payloads, and precise hidden coordinates are structurally absent.

### ADR-009: Listing publication is many-to-many

- Status: accepted
- Decision: use tenant/listing assignments with purpose and lifecycle rather than a JSON allow-list on `site_config`.
- Consequence: co-listing, temporary features, hot lists, and tenant-specific publication can coexist without duplicating canonical listings.
- Review test: a listing is visible only when canonical eligibility and an active authorized publication/assignment both hold.

### ADR-010: Tenant public routes have no global fallback

- Status: accepted
- Decision: unresolved tenant, missing assignment, suspended site, draft content, or unavailable listing returns a non-enumerating 404.
- Consequence: global discovery remains a separate explicit product surface.
- Review test: tenant pages cannot fall through to a global MLS result when tenant authorization fails.

### ADR-011: Public site configuration is a projection

- Status: accepted
- Decision: public consumers receive a typed server projection. Full-row anonymous `site_config` access is retired after direct-client migration.
- Consequence: prompts, model matrix, operations, billing, integrations, owner data, and review notes remain private.
- Review test: adding a private column to `site_config` does not alter public output.

### ADR-012: Shadow reads are sampled and non-authoritative

- Status: accepted
- Decision: during migration, the new path serves the response; a bounded sample compares the legacy path asynchronously and records normalized discrepancies.
- Consequence: legacy success never overrides a secure miss from the new path.
- Review test: shadow failure cannot affect latency, response, authorization, or availability.

### ADR-013: Side effects model uncertain delivery explicitly

- Status: accepted
- Decision: a provider timeout after dispatch becomes `unknown_delivery`, not an automatic fresh send.
- Consequence: retry logic reconciles with provider idempotency/status where supported and otherwise escalates for bounded review.
- Review test: database failure after provider acceptance cannot produce an uncontrolled duplicate notification.

### ADR-014: TAH readiness and retrieval are distinct SLOs

- Status: accepted
- Decision: report hydration success, checkpoint age, manifest validity, cold-start readiness, warm retrieval latency, and result confidence separately.
- Consequence: a fast empty response is not counted as healthy retrieval.
- Review test: dashboards distinguish missing cartridge, invalid manifest, cold hydration, zero results, and downstream synthesis failure.

### ADR-015: Audio UI consumes a stable state contract

- Status: accepted boundary; implementation choice deferred
- Decision: UI renders only a deterministic audio state (`idle`, `listening`, `speaking`, `restarting`, `error`) and never raw browser recognition event churn.
- Consequence: an XState dependency is not automatically required; adopt it only if a focused spike proves the existing coordinator cannot express transitions and cleanup safely.
- Review test: recognition restarts do not remount microphone ownership or flicker the browser recording indicator.

### ADR-016: Migrations are additive and release-controlled

- Status: accepted
- Decision: add tables/projections first, dual-run with secure precedence, then remove legacy reads/policies in a later migration.
- Consequence: rollback flips traffic, not destructive DDL.
- Review test: every release stage has an independent feature flag, verification query, and abort threshold.

### ADR-017: `site_config.id` is the phase-one tenant scope

- Status: accepted 2026-08-20; resolves OD-015
- Decision: application `tenantId` values use the authoritative `site_config.id` UUID. Domain and listing-assignment tables reference `site_config(id)` directly; no free-form tenant compatibility key is introduced.
- Consequence: current ownership is enforceable with foreign keys and existing owner relations. A future multi-site organization model requires an explicit organization table and migration.
- Review test: every persisted phase-one tenant relation has a UUID foreign key to `site_config`; `agent_id` and browser strings are never used as tenant foreign keys.

### ADR-018: Canonical listing assignments use `properties.id`

- Status: accepted 2026-08-20; resolves OD-008
- Decision: `tenant_listing_assignments.property_id` is a non-null UUID foreign key to `properties(id)`. MLS and provider IDs are aliases used only to resolve deterministic backfill candidates.
- Consequence: an ambiguous or missing alias produces a migration conflict instead of a partially linked assignment.
- Review test: every active assignment joins exactly one canonical property; no public repository authorizes from an MLS string alone.

### ADR-019: Assignment lifecycle is explicit and revisioned

- Status: accepted 2026-08-20; resolves OD-009
- Decision: assignments carry enumerated purpose, `published_at`, nullable `expires_at`, nullable `revoked_at`, and a positive revision. Revocation/republishing updates the authoritative relation rather than creating ambiguous active duplicates.
- Consequence: visibility is calculable without interpreting JSON configuration or status prose.
- Review test: future, expired, and revoked assignments fail tenant publication; cache invalidation includes assignment revision.

## Open decisions

Each item must be resolved before its blocking ticket begins.

| ID | Decision | Default recommendation | Blocks | Owner / deadline |
|---|---|---|---|---|
| OD-001 | Public response for unknown, suspended, draft, or cross-tenant resource | Uniform 404 with no tenant existence detail | Resolver and route migration | Product + security, before SP-026 |
| OD-002 | Public coordinate precision | Exact only when provider/publication permits; otherwise deterministic fuzzing or neighborhood centroid | `PublicListing` schema | Product + compliance, before SP-030 |
| OD-003 | Recon public surface | Separate deliberately public summary; full recon remains authenticated | Inventory projection | Product, before SP-031 |
| OD-004 | Custom-domain verification method and renewal | DNS TXT challenge with expiry and recheck; no manual permanent activation | Domain mutation API | Platform, before SP-024 |
| OD-005 | Edge manifest shape | One versioned environment manifest initially; shard by normalized hostname prefix only after measured size pressure | Projection writer | Platform, before SP-041 |
| OD-006 | Entitlement authority | Stripe-derived database entitlement snapshot with revision; never request body or client state | Capability policy | Billing/platform, before protected feature migration |
| OD-007 | Legacy realtor browser queries | Migrate to authorized server routes; retain direct client query only with proven owner-scoped policy | RLS remediation | Feature owners, before SP-052 |
| OD-010 | Preview tenant semantics | Preview domains resolve only preview rows and preview-authorized sites; production data is never implicit | Resolver | Platform, before SP-023 |
| OD-011 | Resolver cache TTLs | Short negative TTL, revision-tagged positive cache, no shared cache for actor authorization | Resolver | Platform, before SP-023 |
| OD-012 | Required CI lane | Focused unit/security on every PR; tenant-isolation integration and production build as required checks | Branch protection | Engineering, before first implementation PR |
| OD-013 | Shadow-read sample rate and redaction | Begin at 1%; record hashes/categories, never private payloads | Migration telemetry | Security/ops, before SP-034 |
| OD-014 | Maximum domain propagation SLO | Target p95 under 2 minutes, hard alert at 10 minutes pending measured provider behavior | Outbox operations | Ops, before SP-043 |

## Pull request review gates

### Gate A: Scope and provenance

- The PR contains one boundary or one migration stage, not the entire platform conversion.
- Every changed file is classified in the branch decomposition.
- No crawler checkpoint, local backup, generated binary, secret, or unrelated worktree edit is accidentally included.
- Baseline failures are recorded before implementation and new failures are distinguishable.

### Gate B: Identity and trust

- The authoritative source for tenant, actor, listing, session, and entitlement is named.
- Request body, query, cookie, URL, forwarded header, and internal-looking header are treated as claims until validated.
- Context is passed explicitly; repositories do not infer tenant from globals or arbitrary IDs.
- Unknown and conflicting identities fail closed.

### Gate C: Data projection

- Public output uses an allow-listed type and runtime schema.
- Internal model additions cannot automatically enter the public response.
- Cross-tenant, draft, private, suppressed, expired, and unavailable records are excluded in the repository, not only hidden in JSX.
- Exact location and provider/licensing restrictions are represented in policy.

### Gate D: Database and RLS

- Migration is additive, idempotent where practical, and has a dry-run/backfill report.
- Preflight and postflight queries are attached.
- Policies are tested with anonymous and two real tenant-scoped authenticated fixtures.
- Service-role success is not presented as proof of RLS correctness.
- Rollback does not restore a known cross-tenant or full-public policy.

### Gate E: Distributed side effects

- Mutation and outbox write are transactional.
- Claim is atomic and lease-bounded.
- Retry has backoff, max attempts, dead-letter behavior, and stale-revision supersession.
- Remote success plus local failure has a reconciliation path.
- Logs and metrics use hashes/IDs, not secret payloads.

### Gate F: Verification

- Focused unit tests pass.
- Security regression matrix passes, including negative cases.
- Production build passes.
- Targeted Jamie E2E passes if shared routing, session, listing, or audio behavior changed.
- Preview smoke test and rollback drill are recorded for migration PRs.

## Definition of done by work type

### Resolver code

- Exact normalization and environment mapping are unit-tested.
- Promise-level request deduplication is measured.
- Authoritative DB confirmation is mandatory on protected/public data access.
- Unknown, suspended, stale, and preview-confused states return typed failures.
- Call sites do not consume untrusted tenant headers.

### Public inventory code

- `PublicListing` runtime schema and TypeScript type share one source.
- Repository owns eligibility and assignment filtering.
- Route and component code receive only the projection.
- Import-boundary test prevents anonymous routes from importing Mongo/internal repositories.
- Property detail, listing grids, maps, Jamie context, and guide paths agree on listing identity.

### Migration

- Schema, constraints, indexes, comments, grants, and RLS are reviewed together.
- Backfill is deterministic; conflicts are reported and not guessed.
- Query catalog is clean in staging.
- Forward compatibility and rollback flag are proven.
- Production mutation occurs in an approved window with an owner observing metrics.

### Operational worker

- Multiple concurrent workers do not duplicate work.
- Expired lease recovery, poison-job handling, and latest-revision wins are tested.
- Reconciliation detects missing, extra, stale, and malformed projection entries.
- Atlas shows pending, applied, stale, retrying, and dead-letter states.
- Alerts have actionable identifiers and a runbook link.

### Documentation

- Decision register reflects the implementation.
- Threat model and identity map are updated for new trust edges.
- Runbook names real flags, commands, dashboards, and owners before production release.
- Any temporary compatibility path has a removal issue and deadline.

## Mandatory abort criteria

Stop a rollout immediately when any of these occurs:

- Cross-tenant data appears in an HTTP response, database probe, cache, log, notification, or AI context.
- Host normalization yields ambiguous ownership.
- Edge projection points to a different tenant or newer revision than the authoritative row.
- Anonymous access reaches private `site_config` fields.
- Public inventory emits an internal-only field or bypasses assignment policy.
- Notification delivery cannot distinguish failed from unknown acceptance and begins duplicating sends.
- Migration conflict count is nonzero and the script would choose a winner automatically.
- Rollback requires restoring a policy already identified as unsafe.

## Completion sign-off

| Area | Required signer | Evidence |
|---|---|---|
| Tenant resolution | Platform owner | Resolver tests, host matrix, latency |
| Authorization/RLS | Security reviewer | Two-tenant negative suite, policy catalog |
| Public inventory | Product + data owner | Projection snapshot, provider rules |
| Domain projection | Operations owner | Convergence and rollback drill |
| AI/TAH consumers | AI platform owner | Context provenance and cold/warm SLOs |
| Release | Release owner | Checklist, flags, dashboards, rollback result |
