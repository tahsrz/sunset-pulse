# Current Branch Decomposition

## Reality check

`codex/crawler-operations-and-retrieval` currently contains more than 60 modified files across unrelated subsystems, plus an untracked Supabase migration and this sprint packet. The work should be checkpointed before any split. Do not attempt to reconstruct it from memory or discard overlapping edits.

## Dependency graph

```text
PRA Core authentication and response correctness
  |\
  | +--> PRC Lead and agent ownership
  |          +--> PRD Notification/inbox delivery correctness
  |
  +--> PRE Public inventory visibility
             +--> PRF TenantContext and tenant inventory

PRB Billing and provisioning durability (mostly independent)

PRG TAH crawler, hydration, retrieval, and Atlas operations (mostly independent)

PRH Residual route/type stabilization (after subsystem PRs)
```

The new domain registry/outbox and assignment schema belong to the new sprint, not the current broad hardening branch, unless implementation begins before branch publication.

## Checkpoint before splitting

1. Record `git status --short` and `git diff --name-only`.
2. Save a patch artifact outside Git history if desired, without deleting the working changes.
3. Run the current focused tests and build once.
4. Create one local checkpoint commit only when the user requests it.
5. Split from that recoverable checkpoint using path-aware commits or dedicated branches.
6. Re-run each resulting branch independently.

Avoid interactive staging for this worktree. Use explicit file lists and inspect every staged diff.

## PRA: Core authentication and response correctness

Purpose: establish fail-closed session and operator behavior used by later admin/tenant work.

Candidate files:

- `apps/pulse/lib/core/getSessionUser.js`
- `apps/pulse/lib/core/publicApiRateLimit.ts`
- `apps/pulse/app/api/auth/session/route.ts`
- any focused operator/session tests already changed or newly added

Acceptance gate:

- Profile lookup errors fail closed.
- Session responses vary by cookie.
- Production client-address policy ignores untrusted forwarding headers.
- Operator access tests pass.

Risk:

- `operator_access.ts` still has development/private-network behavior and should be reviewed before claiming the boundary complete.

## PRB: Billing, Stripe, and site lifecycle durability

Candidate files:

- `apps/pulse/lib/billing/stripeWebhookLedger.ts`
- `apps/pulse/lib/billing/siteBillingRecheck.ts`
- `apps/pulse/app/api/onboarding/site/route.ts`
- `apps/pulse/lib/sites/siteConfigStore.ts` portions for CAS/expiry claim
- `apps/pulse/lib/sites/siteProvisioning.ts`
- `apps/pulse/lib/sites/siteLifecycleNotifications.ts`
- `apps/pulse/app/api/admin/sites/launch-kit/route.ts`
- `apps/pulse/app/api/admin/sites/review/route.ts`
- related billing, provisioning, launch-kit, and ledger tests

Acceptance gate:

- Stripe retry/stale lease tests pass.
- Onboarding rejects mismatched checkout identity.
- Billing recheck never selects arbitrary customer subscription.
- Grace expiry atomically claims one transition.
- Site config CAS conflict returns an explicit conflict.

Overlap warning:

`siteConfigStore.ts` may later be needed by TenantContext. Keep the billing CAS/expiry commit isolated so TenantContext can build on it without dragging unrelated lifecycle changes.

## PRC: Public lead ingestion and agent ownership

Candidate files:

- `apps/pulse/app/api/sites/leads/route.ts`
- `apps/pulse/lib/sites/agentLeadNotification.ts`
- `apps/pulse/lib/intelligence/leadProcessor.ts`
- `apps/pulse/app/api/admin/agent-leads/route.ts`
- `apps/pulse/app/api/admin/agent-leads/action-events/route.ts`
- `apps/pulse/app/api/admin/leads/correspondence/route.ts`
- `apps/pulse/app/api/admin/leads/route.ts`
- `apps/pulse/supabase/migrations/20260818010000_agent_site_lead_idempotency.sql`
- related lead-route and lead-notification tests

Depends on: PRA.

Acceptance gate:

- Browser agent/site/listing identifiers cannot redirect a lead.
- Duplicate request yields one lead and one side-effect chain.
- Realtor A cannot mutate Realtor B's lead.
- Legacy correspondence fails closed for realtor access.
- Migration is present, reviewed, and included.

Overlap warning:

Public lead ingestion will ultimately consume TenantContext. In this PR, retain the current authoritative site lookup but document the future adapter. Do not implement half of TenantContext here.

## PRD: Native alert and notification correctness

Candidate files:

- `apps/pulse/app/api/admin/agent-leads/alerts/route.ts`
- `apps/pulse/app/api/admin/agent-leads/notifications/route.ts`
- `apps/pulse/lib/intelligence/agentAlertNotifications.ts`
- `apps/pulse/lib/intelligence/agentAlerts.ts`
- `apps/pulse/lib/intelligence/agentNotificationStore.ts`
- notification route tests

Depends on: PRA and preferably PRC.

Acceptance gate:

- Realtor alert reads are tenant scoped.
- Delivery update errors propagate.
- Agent selection is server verified.
- Notification mutation checks affected rows, or the remaining gap is explicitly documented.

Do not include the new generalized domain outbox here. Existing notification-delivery tables are useful precedent, but the domain projection is a separate sprint migration.

## PRE: Public listing visibility

Candidate files:

- `apps/pulse/lib/data/listingRepository.ts`
- `apps/pulse/lib/core/propertyQueryBuilder.js`
- `apps/pulse/app/api/properties/route.ts`
- `apps/pulse/app/api/properties/search/route.ts`
- `apps/pulse/app/api/properties/search/advanced/route.ts`
- `apps/pulse/app/api/properties/[id]/route.ts`
- `apps/pulse/app/api/properties/[id]/rent/route.ts`
- `apps/pulse/app/api/properties/[id]/recon/route.ts`
- `apps/pulse/app/api/properties/user/[userId]/route.ts`
- `apps/pulse/app/api/location-guess/listings/route.ts`
- `apps/pulse/app/api/value-guess/listings/route.ts`
- updated listing read-surface tests and new private fixture tests

Depends on: PRA for authenticated owner route behavior.

Acceptance gate:

- Canonical and legacy public paths reject private/demo/deleted records.
- Search regex input is escaped.
- Owner-property route rejects IDOR.
- Recon rejects private or coordinate-less listings safely.
- Tests expect public helpers/options rather than old unrestricted calls.

## PRF: Tenant routing and tenant inventory isolation

Candidate files:

- `apps/pulse/middleware.js`
- `apps/pulse/lib/sites/tenantRouting.ts`
- `apps/pulse/lib/sites/siteUrls.ts`
- `apps/pulse/lib/sites/siteData.ts`
- `apps/pulse/app/sites/[site]/[[...path]]/page.tsx`
- `apps/pulse/app/api/properties/featured/route.ts`
- `apps/pulse/app/api/properties/hot-list/route.ts`
- tenant routing/site tests

Depends on: PRE.

Current blocker:

Featured and hot-list routes read `x-sunset-tenant`, but middleware bypasses tenant rewriting for `/api` and strips that header. Before PRF is publishable, API routes must use a host-derived server resolver or the tenant-aware claim must be removed until TenantContext lands.

Acceptance gate:

- Tenant detail and metadata reject listings outside tenant assignment/allowlist.
- Empty tenant configuration does not use global inventory.
- Host and rewritten path must agree.
- Forwarded-host trust is explicitly configured and tested.
- Reserved names are consistent across routing and URL generation.
- Custom-domain output is validated.
- API tenant identity works without client/internal tenant headers.

## PRG: TAH crawler, hydration, retrieval, and Atlas operations

Candidate files:

- `README.md`
- `apps/pulse/README.md`
- `apps/pulse/lib/wikipedia/crawl4aiWikipedia.ts`
- `apps/pulse/lib/ai/brain/remote_atlas.ts`
- `apps/pulse/lib/ai/brain/pulse_query.ts`
- `apps/pulse/lib/ai/brain/cartridge_ranking.ts`
- `apps/pulse/lib/core/swarm_retriever.ts`
- `apps/pulse/lib/ai/jamieKnowledgeFallback.ts`
- `apps/pulse/lib/tensorzero/jamieBackbone.ts`
- `apps/pulse/app/api/chat/route.ts`
- `apps/pulse/app/api/jamie/vercel-chat/route.ts`
- `apps/pulse/app/api/atlas/processes/route.ts`
- `apps/pulse/app/atlas/page.tsx`
- `apps/pulse/components/atlas/RetrievalInspector.tsx`
- `apps/pulse/components/atlas/WikipediaProcessTerminal.tsx`
- `apps/pulse/scripts/evaluate-jamie-retrieval.ts`
- cartridge, swarm, and crawler tests

Mostly independent, but chat routes may contain unrelated authorization hardening. Inspect hunks and split by behavior rather than assigning entire files automatically.

Acceptance gate:

- Ingestion checkpoint behavior is tested.
- Remote hydration handles partial/corrupt content safely.
- Ranking calibration tests pass.
- Jamie fallback and one shared retrieval consumer use the same contract.
- Process terminal distinguishes stale, stopped, unauthorized, and healthy.

## PRH: Residual route/type stabilization

Candidate files require individual hunk review:

- admin branding/library/prompts/render queue
- menu, scheduling, tours, valuation
- admin route typing fixes

These should not become one miscellaneous dumping-ground PR. For each file, classify the diff as:

- security fix required by another PR,
- build/type correction,
- behavior change,
- unrelated user work.

Only build/type corrections with no behavior change belong in a stabilization PR. Behavioral edits must join their owning subsystem.

## Recommended publication order

1. PRA Core authentication
2. PRB Billing durability
3. PRE Public listing visibility
4. PRC Lead ownership and migration
5. PRD Alert/notification scope
6. PRG TAH and crawler operations
7. PRF Tenant routing after API resolver correction
8. PRH narrowly classified residual corrections

This order minimizes cross-tenant risk while allowing the largely independent retrieval work to move without waiting for the new domain registry sprint.

## Cherry-pick and split risks

- `siteConfigStore.ts`: billing CAS/expiry and future TenantContext hydration.
- `siteData.ts`: tenant site normalization and tenant listing scope.
- public lead route: listing authority plus future TenantContext.
- chat routes: retrieval plus auth/security behavior.
- README files: multiple operational changes.

For these files, split commits by hunk only after reviewing the complete diff and running both subsystem test groups. Do not cherry-pick a partial helper change without its caller and tests.

