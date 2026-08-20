# Sunset Pulse: Engineering State and New Sprint Brief

Prepared for Gemini brainstorming on 2026-08-19.

The repository-grounded execution packet that follows this brief is available at [`docs/sprint-2026-08-20/README.md`](./sprint-2026-08-20/README.md). It contains the finalized threat model, contracts, migration design, failure analysis, regression matrix, inventory architecture, branch decomposition, observability plan, and runbooks.

## How to read this brief

This is an engineering handoff, not a release announcement. The work described here currently lives in the local working tree on `codex/crawler-operations-and-retrieval`. The branch contains a broad set of uncommitted changes across retrieval, crawler operations, billing, tenant routing, public inventory, leads, notifications, and supporting tests. Some slices have focused tests and repeated production builds behind them; others have only focused coverage or code review. Do not assume the entire set is deployed merely because an individual build passed.

The purpose of the next sprint should be to convert this broad hardening pass into a small number of explicit platform boundaries with regression coverage and operational proof.

## Product direction

Sunset Pulse is becoming an intelligence operating system with four connected planes:

1. The public experience: agent sites, listings, Jamie, voice, lead capture, property exploration.
2. The agent operating surface: Command Center, ranked leads, alerts, one-click actions, inbox, site configuration.
3. The knowledge plane: TAH cartridges, Atlas, crawler processes, retrieval, Wikipedia ingestion, shared grounding for Jamie and other agents.
4. The control plane: identity, tenancy, billing, notifications, durable jobs, auditability, publication policy.

The engineering problem is no longer a lack of features. It is ensuring that all four planes agree about identity, ownership, visibility, authority, and lifecycle.

## Current non-negotiable invariants

These should be treated as architectural policy in the next sprint:

- Browser-supplied tenant, role, payment, listing, memory, and agent identifiers are hints, not authority.
- Public listing reads must pass an explicit publication boundary.
- Tenant pages must never fall back to another tenant's inventory.
- Realtor reads and mutations must resolve the owned agent relationship on the server.
- External side effects must be idempotent and retryable.
- A database error must not be interpreted as an empty successful result when that changes authorization or delivery state.
- Websocket events are invalidation signals; authoritative state comes from server-enriched reads.
- Serverless processes must use durable claims or leases rather than process-global flags.
- TAH retrieval must be shared infrastructure, not a Jamie-only special case.
- UI state must reflect a stable application state machine, not raw browser speech events.

## What changed in the current worktree

### 1. Wikipedia ingestion, TAH retrieval, and Atlas operations

The crawler and retrieval work is the strategic foundation of this branch.

Relevant modules include:

- `apps/pulse/lib/wikipedia/crawl4aiWikipedia.ts`
- `apps/pulse/lib/ai/brain/remote_atlas.ts`
- `apps/pulse/lib/ai/brain/pulse_query.ts`
- `apps/pulse/lib/ai/brain/cartridge_ranking.ts`
- `apps/pulse/lib/core/swarm_retriever.ts`
- `apps/pulse/lib/ai/jamieKnowledgeFallback.ts`
- `apps/pulse/lib/tensorzero/jamieBackbone.ts`
- `apps/pulse/app/api/atlas/processes/route.ts`
- `apps/pulse/components/atlas/WikipediaProcessTerminal.tsx`
- `apps/pulse/components/atlas/RetrievalInspector.tsx`
- `apps/pulse/scripts/evaluate-jamie-retrieval.ts`

The intended flow is:

```text
Crawl4AI worker
  -> normalized Wikipedia document
  -> checkpointed ingestion
  -> binary TAH cartridge
  -> durable/remote cartridge storage
  -> Atlas hydration
  -> shared retrieval and ranking
  -> Jamie, Command Center, and future agent consumers
```

Work in this branch improves retry behavior, remote Atlas hydration, cartridge ranking, shared retrieval, crawler checkpointing, process visibility, and Jamie's knowledge fallback. The architectural target is larger than "Jamie can search Wikipedia": all agents should be able to retrieve grounded content through one edge-aware knowledge interface.

What still requires proof:

- Fresh serverless instances can hydrate the required cartridges reliably.
- Corrupt or partial remote content cannot poison a warm instance.
- Retrieval behavior is stable when local files are absent.
- Cartridge freshness, source provenance, and crawler checkpoint age are observable.
- Ranking does not automatically assign every TAH hit a perfect score.
- The same query contract works for Jamie and non-Jamie agents.
- The permanent crawler startup task, remote heartbeat, and production status display agree on one process identity.

Do not make Wikipedia edit history, public wikis, or another third-party content system the operational KV store. Wikipedia is a source corpus. Checkpoints, leases, manifests, and process state belong in storage designed for application state.

### 2. Stripe webhook ledger and billing authority

Relevant modules:

- `apps/pulse/lib/billing/stripeWebhookLedger.ts`
- `apps/pulse/lib/billing/siteBillingRecheck.ts`
- `apps/pulse/app/api/onboarding/site/route.ts`
- `apps/pulse/lib/sites/siteProvisioning.ts`
- `apps/pulse/lib/sites/siteConfigStore.ts`

Changes:

- Failed Stripe events can be retried.
- Stale `processing` events can be reclaimed after a lease timeout.
- Supabase is the authoritative webhook claim ledger.
- A duplicate Mongo mirror record no longer suppresses legitimate processing.
- Supabase state-transition failures propagate.
- Onboarding validates payment and checkout identity server-side.
- Billing recheck uses the stored subscription pointer rather than selecting an arbitrary customer subscription.
- Grace expiration uses an atomic claim before state transition and notification.

The unresolved architecture issue is duplicated entitlement logic. Site publication, onboarding, billing portal access, grace handling, and notification eligibility should all consume one server-side entitlement result.

Proposed contract:

```ts
type SiteEntitlement = {
  agentId: string;
  state: 'active' | 'trialing' | 'grace' | 'suspended' | 'unlinked';
  mayEdit: boolean;
  mayPublish: boolean;
  mayReceiveLeads: boolean;
  source: 'subscription' | 'trial' | 'manual_override';
  effectiveUntil: string | null;
  reason: string;
};
```

### 3. Site configuration consistency

Relevant modules:

- `apps/pulse/lib/sites/siteConfigStore.ts`
- `apps/pulse/app/api/admin/sites/launch-kit/route.ts`
- `apps/pulse/app/api/admin/sites/review/route.ts`
- `apps/pulse/lib/sites/siteLifecycleNotifications.ts`

Changes:

- Site configuration writes support an expected `updatedAt` value.
- Launch-kit and review routes use compare-and-set when possible.
- Review notification idempotency uses decision, agent, and a notes hash rather than a timestamp.
- Past-due expiration is claimed atomically.

Remaining risk:

- Compare-and-set is optional and therefore not yet a universal invariant.
- Notification delivery after a successful state transition is not yet a durable outbox operation.
- There is no first-class configuration revision history for operator review or rollback.

### 4. Public lead ingestion and deterministic identity

Relevant modules:

- `apps/pulse/app/api/sites/leads/route.ts`
- `apps/pulse/lib/sites/agentLeadNotification.ts`
- `apps/pulse/lib/intelligence/leadProcessor.ts`
- `apps/pulse/supabase/migrations/20260818010000_agent_site_lead_idempotency.sql`

Changes:

- The listing is verified through the canonical repository.
- Tenant site identity is server-derived.
- Idempotency is scoped by agent.
- Explicit `Idempotency-Key` is supported.
- Duplicate submissions return an accepted duplicate result.
- Lead notifications are sent only to tenant-derived recipients, not global operator addresses by default.

Remaining risk:

- The new migration is currently an untracked local file and must be included and applied deliberately.
- Lead identity is still represented across legacy leads, agent site leads, intelligence events, session hashes, and notification projections.
- The legacy correspondence path cannot safely support realtor access until legacy rows gain an authoritative tenant relation.

### 5. Agent alerts, notifications, and lead administration

Relevant modules:

- `apps/pulse/app/api/admin/agent-leads/route.ts`
- `apps/pulse/app/api/admin/agent-leads/alerts/route.ts`
- `apps/pulse/app/api/admin/agent-leads/notifications/route.ts`
- `apps/pulse/app/api/admin/agent-leads/action-events/route.ts`
- `apps/pulse/lib/intelligence/agentNotificationStore.ts`
- `apps/pulse/lib/intelligence/agentAlertNotifications.ts`
- `apps/pulse/lib/intelligence/agentAlerts.ts`
- `apps/pulse/app/api/admin/leads/correspondence/route.ts`

Changes:

- Realtor reads are scoped by a server-resolved owned agent ID.
- Lead mutations reject records outside the resolved agent scope.
- Action events resolve agent authority on the server.
- Notification delivery update failures now throw.
- Legacy correspondence is blocked for realtor access because the legacy table lacks a safe tenant key.

Known remaining defects:

- Notification mutations check Supabase errors but do not consistently prove that exactly one intended row was affected.
- `agentAlertContext.ts` loads a broad recent lead window and filters session identity in memory.
- `agentAlerts.ts` still relies too heavily on event metadata for agent and lead associations.
- Alert delivery, acknowledgment, provider delivery, and retry state are not one durable lifecycle.

Target lifecycle:

```text
intelligence_event
  -> authoritative lead/tenant enrichment
  -> alert policy decision
  -> agent_notification upsert or occurrence increment
  -> delivery_outbox job
  -> provider attempt
  -> delivered / retryable / dead_lettered
  -> agent acknowledgment / archive
```

### 6. Session and route authorization

Relevant modules:

- `apps/pulse/lib/core/getSessionUser.js`
- `apps/pulse/app/api/auth/session/route.ts`
- `apps/pulse/lib/core/publicApiRateLimit.ts`
- `apps/pulse/lib/core/operator_access.ts`

Changes:

- A failed profile query now fails closed rather than producing consumer fallback access.
- Session responses include `Vary: Cookie`.
- Production rate limiting uses a platform-authoritative forwarded address instead of arbitrary forwarding headers.

Remaining risk:

- Development private-network access can grant implicit operator access. It must be impossible to enable accidentally in production-like deployments.
- Authorized operator email bypass remains global by design and needs a documented role boundary.
- Public high-cost endpoints do not yet share one cost/rate policy.

### 7. Public listing visibility and tenant inventory isolation

Relevant modules:

- `apps/pulse/lib/data/listingRepository.ts`
- `apps/pulse/lib/core/propertyQueryBuilder.js`
- `apps/pulse/lib/sites/siteData.ts`
- `apps/pulse/app/sites/[site]/[[...path]]/page.tsx`
- `apps/pulse/app/api/properties/route.ts`
- `apps/pulse/app/api/properties/search/route.ts`
- `apps/pulse/app/api/properties/search/advanced/route.ts`
- `apps/pulse/app/api/properties/[id]/route.ts`
- `apps/pulse/app/api/properties/[id]/rent/route.ts`
- `apps/pulse/app/api/properties/[id]/recon/route.ts`
- `apps/pulse/app/api/properties/user/[userId]/route.ts`
- `apps/pulse/app/api/properties/featured/route.ts`
- `apps/pulse/app/api/properties/hot-list/route.ts`
- `apps/pulse/app/api/location-guess/listings/route.ts`
- `apps/pulse/app/api/value-guess/listings/route.ts`

Changes:

- `getPublicListingById()` enforces public visibility across canonical and legacy data.
- `searchListings(..., { publicOnly: true })` gives anonymous routes an explicit public mode.
- Legacy public reads reject demos and `display_public === false`.
- Search terms are escaped before Mongo regex construction.
- Tenant listing detail and metadata require the listing MLS ID to be in the tenant's configured allowlist.
- Tenant featured inventory no longer falls back to the global list.
- Advanced search, rent, recon, value guess, and location guess use public visibility constraints.
- Recon rejects missing or invalid coordinates and no longer defaults every request to `taz-realty-001` configuration.
- User-owned properties require the session user to match the requested user ID and omit seller information.
- Featured and hot-list routes resolve tenant inventory when tenant context exists.

The current design is safer, but its public/internal distinction is still caller-selected. That is the next abstraction target.

Preferred API:

```ts
getPublicListingById(id, context?)
searchPublicListings(filters, context?)
getInternalListingById(id, access)
searchOwnerListings(ownerId, access)
```

Avoid retaining a vaguely named `getListingById()` that may or may not be safe depending on where it is called.

### 8. Tenant routing and host authority

Relevant modules:

- `apps/pulse/middleware.js`
- `apps/pulse/lib/sites/tenantRouting.ts`
- `apps/pulse/lib/sites/siteUrls.ts`

Changes:

- The actual `Host` header is preferred for tenant resolution.
- `x-forwarded-host` is trusted only when `TRUSTED_PROXY_HOST_HEADER=true`.
- Middleware deletes inbound `x-sunset-*` tenant headers before setting server-owned values.
- Tenant routing and URL generation share reserved-subdomain validation.
- Custom domains are validated before public URL generation.

Operational question:

- Confirm the exact Vercel host-header behavior before setting `TRUSTED_PROXY_HOST_HEADER`. The secure default is false. Only enable it if the trusted proxy overwrites the forwarded host rather than appending or preserving caller input.

Architectural target:

```ts
type TenantContext = {
  slug: string;
  agentId: string;
  hostname: string;
  site: TenantSite;
  kind: 'first-party' | 'tenant' | 'global';
  source: 'host' | 'custom-domain' | 'internal';
};
```

Pages and APIs should consume `TenantContext`, not raw request headers.

## Verification actually completed

The work has repeatedly passed a Next.js production build that:

- compiled successfully,
- completed TypeScript validation,
- generated 196 static pages,
- completed route trace collection.

Focused test groups that passed during the audit include:

- Jamie public guide routing,
- launch-kit normalization,
- agent alerts,
- native agent notifications,
- operator access,
- lead/action/correspondence routes,
- public guide lead ingestion,
- billing/site provisioning,
- Stripe webhook ledger snapshots,
- retrieval and Wikipedia ingestion tests.

The latest host-routing hardening has focused routing coverage at 3/3. A full build passed immediately before the final host utility edit; run one final full build and the relevant full unit suite before publishing the branch.

Do not convert "focused tests passed" into "all CI will pass." This branch is broad, the worktree is still dirty, and the migration must be included and applied.

## Highest-confidence remaining problems

### Problem 1: Safe behavior is opt-in at too many call sites

Public listing visibility, tenant identity, operator agent scope, entitlement, and notification ownership are each partly enforced by callers selecting the correct helper or option.

This invites regression. The safe path should be the default and unrestricted behavior should require an explicit internal capability.

### Problem 2: Identity is represented too many ways

Current identities include:

- Supabase user ID,
- Mongo owner ID,
- agent ID,
- tenant slug,
- custom domain,
- global session ID,
- anonymous session hash,
- lead ID,
- legacy lead ID,
- MLS ID,
- canonical property UUID.

The next sprint should document the authoritative mapping and create shared resolvers. Without that, every new integration recreates identity logic.

### Problem 3: Dual storage remains a policy hazard

Supabase and Mongo coexist for listings, site configuration, and operational mirrors. The fallback behavior is useful during migration, but it doubles the number of visibility and consistency rules.

Every dual-read module needs an explicit statement of:

- authoritative store,
- fallback store,
- conflict behavior,
- stale-data behavior,
- write ownership,
- migration exit condition.

### Problem 4: Side effects need one outbox pattern

Stripe processing, lead emails, site lifecycle messages, high-intent alerts, and external notification delivery all solve pieces of the same problem differently.

The sprint should establish one outbox/claim/attempt model and migrate one high-value flow to prove it.

### Problem 5: Jamie's audio lifecycle remains product-visible debt

The data plane is becoming safer, but a flickering microphone or missing user message destroys trust immediately. Jamie needs one persistent audio coordinator and a deterministic UI state machine.

### Problem 6: The knowledge plane lacks a production SLO

"All of Wikipedia will eventually be in TAH" is a direction, not an operational definition. The crawler and retrieval system needs measurable targets:

- documents ingested per hour,
- checkpoint age,
- cartridge publication lag,
- hydration success rate,
- retrieval p50/p95,
- grounded-answer rate,
- fallback-to-web rate,
- no-answer rate,
- stale-source rate.

## Proposed sprint goal

**Make identity, public data, and knowledge retrieval explicit platform services, then prove them with regression tests and operational signals.**

This goal is intentionally narrower than "finish security" or "finish Jamie." It converts the broad work of this branch into reusable boundaries.

## Proposed sprint backlog

### P0: Integrate and prove the current branch

Deliverables:

- Inventory all modified and untracked files.
- Split or intentionally retain the branch scope; document that decision.
- Add the lead idempotency migration to the intended change set.
- Run the complete unit suite.
- Run the targeted Jamie E2E suite.
- Run the production build.
- Record migration and environment prerequisites.
- Publish a PR with a subsystem-organized description and known-risk section.

Acceptance criteria:

- No unexplained untracked files.
- Full build passes.
- Required focused tests pass.
- Any remaining failing test has an owner and documented reason.
- Vercel variables are listed without secret values.
- Database migration order is explicit.

### P0: Public inventory regression matrix

Build one fixture representing a private legacy property and assert that it cannot escape through:

- property list,
- basic search,
- advanced search,
- detail,
- rent,
- recon,
- value guess,
- location guess,
- tenant detail,
- featured,
- hot-list.

Add corresponding positive tests for a public property and a tenant-allowed property.

Acceptance criteria:

- The same visibility fixture drives every route test.
- Private data never appears in response bodies or metadata.
- Tenant A cannot resolve Tenant B's listing.
- A global route cannot accidentally infer tenant ownership.

### P0: Server-only tenant context

Implement one tenant resolver that consumes validated request information and returns an authoritative `TenantContext`.

Acceptance criteria:

- Raw `x-sunset-tenant` reads disappear from business logic.
- Client-supplied `x-sunset-*` headers cannot affect tenant resolution.
- Reserved subdomains are tested once through the shared validator.
- Trusted proxy behavior has explicit tests for enabled and disabled states.
- Unknown and unpublished tenants fail closed.

### P1: Canonical public inventory service

Extract a public inventory API that owns:

- source selection,
- visibility,
- tenant allowlisting,
- normalization,
- safe projections,
- coordinate requirements,
- cache policy.

Acceptance criteria:

- Public routes no longer import `Property` directly.
- Public routes do not call unrestricted listing helpers.
- Legacy fallback policy is tested and documented.
- Returned data uses a typed public projection.

### P1: Authoritative identity map

Create a short architecture record and server-side resolvers for:

- session user to owned agent,
- host to tenant,
- tenant to site config,
- MLS/canonical ID to listing,
- global session to lead,
- intelligence event to agent and lead.

Acceptance criteria:

- Each mapping names one authoritative source.
- Caller-supplied IDs are always verified against that source.
- Failed lookups fail closed.
- Legacy exceptions are documented with a retirement path.

### P1: One durable notification outbox

Choose a single initial flow, preferably high-intent agent notifications, and implement:

- durable intent row,
- atomic claim,
- lease timeout,
- idempotency key,
- provider attempt record,
- exponential backoff,
- dead-letter state,
- manual replay command or route,
- affected-row verification.

Acceptance criteria:

- Concurrent workers cannot double-send.
- A provider timeout can be retried safely.
- A crash after provider success has a defined reconciliation behavior.
- Operators can distinguish queued, processing, delivered, failed, and dead-lettered.

### P1: TAH production readiness contract

Define and instrument:

- crawler worker identity,
- heartbeat freshness,
- current checkpoint,
- latest completed cartridge manifest,
- remote object checksum,
- hydration source and timestamp,
- retrieval latency and result provenance.

Acceptance criteria:

- Atlas reports remote process state without requiring local machine access.
- A stale worker and a stopped worker are distinguishable.
- Hydration never exposes a partially written cartridge.
- Every retrieval result identifies its source cartridge and confidence.
- Jamie and one non-Jamie agent use the same retrieval API.

### P1: Jamie audio state machine

Implement a single coordinator with states:

```text
idle
requesting_permission
listening
speaking
interrupting
restarting
error
stopped
```

Acceptance criteria:

- Recognition is not recreated by ordinary component rerenders.
- TTS pauses recognition without releasing and reacquiring the microphone unnecessarily.
- Barge-in stops TTS and resumes listening once.
- A stale recognition callback cannot mutate state after shutdown.
- A restart hard timeout rebuilds a wedged recognition instance.
- The Chrome microphone indicator does not continuously flicker during an idle open chat.
- User messages render immediately and persist across minimized, docked, and workspace modes.

### P2: Shared entitlement service

Centralize site billing and publication decisions.

Acceptance criteria:

- Onboarding, publication, grace expiry, billing portal, and site rendering use the same entitlement result.
- Deleted or mismatched subscription pointers fail closed.
- Manual overrides are explicit and audited.
- Entitlement changes produce durable lifecycle events.

### P2: Explicit listing ownership migration design

Design, but do not rush, a schema migration adding fields such as:

```text
agent_id
tenant_id
visibility
publication_status
published_at
```

The design must cover MLS listings that may legitimately appear on multiple agent sites. A simple single-owner column may be insufficient; a `tenant_listing_assignments` relation may be the correct model.

## Recommended sprint sequence

Day 1:

- Freeze and inventory the current branch.
- Add the security regression matrix.
- Run full verification and document real failures.

Day 2:

- Build `TenantContext`.
- Migrate tenant page, featured, hot-list, and recon consumers.
- Add host and forwarded-host tests.

Day 3:

- Build the canonical public inventory service.
- Remove direct Mongo reads from anonymous property routes.
- Introduce typed public projections.

Day 4:

- Implement the first durable notification outbox flow.
- Add concurrency, stale lease, retry, and zero-row tests.

Day 5:

- Instrument TAH crawler/hydration/retrieval health.
- Wire one non-Jamie agent to shared retrieval.
- Run the full integration gate and prepare the release PR.

Keep the Jamie audio state machine as a parallel focused track only if a second engineer or agent can own it without destabilizing the integration work. If one person is executing the sprint, move audio immediately after the P0 integration gates because it remains the most visible product defect.

## Questions for Gemini to brainstorm

Gemini should critique these questions rather than simply endorse the plan:

1. Is `TenantContext` the correct boundary, or should tenant resolution and tenant authorization be separate services?
2. Should tenant listing assignment remain an MLS-ID allowlist, or move directly to a many-to-many `tenant_listing_assignments` table?
3. What is the cleanest migration path from dual Mongo/Supabase reads without a risky flag day?
4. Which public property fields should exist in the canonical safe projection?
5. Should recon be a public sanitized product, a tenant-only product, or an authenticated agent tool?
6. How should a notification outbox reconcile the rare case where the provider succeeds but the database success update fails?
7. What SLOs should define TAH retrieval as production-ready?
8. How should TAH confidence combine exact cartridge matches, semantic retrieval, recency, and source authority?
9. Which agent other than Jamie is the best first consumer of shared TAH retrieval?
10. Should Jamie's audio coordinator use a reducer, XState, or a small purpose-built state machine, given the existing React architecture?
11. Which changes should be split into separate PRs before merging this branch, and which are too interdependent to separate safely?
12. What is the smallest end-to-end acceptance test that proves visitor activity becomes a tenant-scoped lead, a scored alert, and a delivered agent notification without cross-tenant leakage?

## Explicit anti-goals for the sprint

- Do not add another route-specific authorization helper.
- Do not add another browser-supplied agent or tenant authority field.
- Do not introduce a third listing source of truth.
- Do not claim "real-time" solely because a websocket fires.
- Do not treat process-global memory as durable serverless state.
- Do not automatically send AI-generated real-estate communication without an agent review checkpoint.
- Do not broaden Jamie with more prompts until the audio and thread lifecycle is stable.
- Do not make global inventory fallback the default on tenant surfaces.
- Do not merge the current branch without the migration, full verification results, and an environment checklist.

## Definition of sprint success

At the end of the sprint, Sunset Pulse should be able to demonstrate this chain:

```text
validated host
  -> authoritative tenant context
  -> tenant-safe public listing
  -> persistent visitor session
  -> verified lead ingestion
  -> deterministic intelligence score
  -> tenant-scoped agent alert
  -> durable notification delivery
  -> shared TAH-grounded answer
```

The demonstration should include one negative case: the same request, with another tenant's identifiers supplied by the browser, must fail closed without exposing data or sending a notification.

That is the sprint. The work should make Sunset Pulse easier to reason about, easier to test, and harder to misuse before adding another layer of product complexity.
