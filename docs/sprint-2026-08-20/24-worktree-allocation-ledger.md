# Worktree Allocation Ledger

Date: 2026-08-20  
Branch: `codex/crawler-operations-and-retrieval`  
Starting SHA: `2f73e86a19b5d2b0dd114a8e81c4a12468546dda`

This ledger assigns every modified or untracked path observed at day-one inspection to one owning workstream. A path has one owner even when a later sprint may need a hunk-level handoff. No files were stashed, reset, cleaned, switched, pulled, committed, or pushed during this allocation.

## PRA: authentication and response correctness

```text
apps/pulse/app/api/admin/branding/route.ts
apps/pulse/app/api/admin/intelligence/route.ts
apps/pulse/app/api/admin/library/route.ts
apps/pulse/app/api/admin/prompts/route.ts
apps/pulse/app/api/admin/render/queue/route.ts
apps/pulse/app/api/auth/session/route.ts
apps/pulse/lib/core/getSessionUser.js
apps/pulse/lib/core/publicApiRateLimit.ts
apps/pulse/app/admin/intelligence/page.tsx
apps/pulse/app/admin/prompts/page.tsx
apps/pulse/tests/unit/admin-intelligence-route.test.ts
```

The admin pages and routes own operator authorization and bounded configuration writes. They must not be moved into the TenantContext migration without preserving the operator boundary.

## PRB: billing, provisioning, and site lifecycle

```text
apps/pulse/app/api/admin/sites/launch-kit/route.ts
apps/pulse/app/api/admin/sites/review/route.ts
apps/pulse/app/api/onboarding/site/route.ts
apps/pulse/lib/billing/siteBillingRecheck.ts
apps/pulse/lib/billing/stripeWebhookLedger.ts
apps/pulse/lib/sites/siteConfigStore.ts
apps/pulse/lib/sites/siteLifecycleNotifications.ts
apps/pulse/lib/sites/siteProvisioning.ts
apps/pulse/tests/unit/site-billing-recheck.test.ts
apps/pulse/tests/unit/site-onboarding-route.test.ts
apps/pulse/tests/unit/site-provisioning.test.ts
apps/pulse/tests/unit/stripe-webhook-ledger-snapshot.test.ts
```

`siteConfigStore.ts` is owned here for the existing lifecycle/CAS behavior; TenantContext must consume it through a reviewed adapter rather than absorbing this workstream.

## PRC: lead identity and ownership

```text
apps/pulse/app/api/admin/agent-leads/action-events/route.ts
apps/pulse/app/api/admin/agent-leads/route.ts
apps/pulse/app/api/admin/leads/correspondence/route.ts
apps/pulse/app/api/admin/leads/route.ts
apps/pulse/app/api/leads/route.ts
apps/pulse/app/api/sites/leads/route.ts
apps/pulse/lib/intelligence/leadProcessor.ts
apps/pulse/lib/sites/agentLeadNotification.ts
apps/pulse/supabase/migrations/20260818010000_agent_site_lead_idempotency.sql
```

The migration remains untracked and intentionally classified. It is not applied to any remote database by this sprint session.

## PRD: alerts and notification delivery

```text
apps/pulse/app/api/admin/agent-leads/alerts/route.ts
apps/pulse/app/api/admin/agent-leads/notifications/route.ts
apps/pulse/lib/intelligence/agentAlertNotifications.ts
apps/pulse/lib/intelligence/agentAlerts.ts
apps/pulse/lib/intelligence/agentNotificationStore.ts
```

## PRE: canonical public inventory

```text
apps/pulse/app/api/location-guess/listings/route.ts
apps/pulse/app/api/properties/[id]/rent/route.ts
apps/pulse/app/api/properties/[id]/route.ts
apps/pulse/app/api/properties/featured/route.ts
apps/pulse/app/api/properties/hot-list/route.ts
apps/pulse/app/api/properties/discover/route.ts
apps/pulse/app/api/kepler/listings/route.ts
apps/pulse/app/api/properties/route.ts
apps/pulse/app/api/properties/search/advanced/route.ts
apps/pulse/app/api/properties/route.ts
apps/pulse/app/api/properties/search/advanced/route.ts
apps/pulse/app/api/properties/search/route.ts
apps/pulse/app/api/properties/user/[userId]/route.ts
apps/pulse/app/api/location-guess/listings/route.ts
apps/pulse/app/api/value-guess/listings/route.ts
apps/pulse/lib/core/propertyQueryBuilder.js
apps/pulse/lib/data/listingRepository.ts
apps/pulse/lib/data/publicInventory.ts
apps/pulse/tests/unit/listing-read-surfaces.test.ts
apps/pulse/tests/unit/public-inventory.test.ts
apps/pulse/tests/unit/public-tenant-header-boundary.test.ts
apps/pulse/tests/unit/historical-public-inventory.test.ts
```

## PRF: TenantContext and tenant inventory isolation

```text
apps/pulse/app/api/properties/[id]/recon/route.ts
apps/pulse/app/sites/[site]/[[...path]]/page.tsx
apps/pulse/context/ThemeProvider.tsx
apps/pulse/lib/sites/siteData.ts
apps/pulse/lib/sites/siteUrls.ts
apps/pulse/lib/sites/tenantRouting.ts
apps/pulse/lib/tenancy/
apps/pulse/tests/fixtures/
apps/pulse/tests/unit/tenant-client-data-boundary.test.ts
apps/pulse/tests/unit/tenant-context-contracts.test.ts
apps/pulse/tests/unit/tenant-context-resolver.test.ts
apps/pulse/tests/unit/tenant-host-normalization.test.ts
apps/pulse/tests/unit/recon-tenant-header-boundary.test.ts
```

The Atlas UI paths are classified here only where their current edits touch tenant/process visibility. Their crawler and retrieval behavior remains owned by PRG at the hunk level.

## PRG: TAH, crawler, retrieval, and Atlas operations

```text
README.md
apps/pulse/README.md
apps/pulse/app/api/atlas/processes/route.ts
apps/pulse/app/api/chat/route.ts
apps/pulse/app/api/jamie/vercel-chat/route.ts
apps/pulse/app/atlas/page.tsx
apps/pulse/components/atlas/RetrievalInspector.tsx
apps/pulse/components/atlas/WikipediaProcessTerminal.tsx
apps/pulse/lib/ai/brain/cartridge_ranking.ts
apps/pulse/lib/ai/brain/pulse_query.ts
apps/pulse/lib/ai/brain/remote_atlas.ts
apps/pulse/lib/ai/jamieKnowledgeFallback.ts
apps/pulse/lib/core/swarm_retriever.ts
apps/pulse/lib/tensorzero/jamieBackbone.ts
apps/pulse/lib/wikipedia/crawl4aiWikipedia.ts
apps/pulse/scripts/evaluate-jamie-retrieval.ts
apps/pulse/tests/unit/cartridge-ranking.test.ts
apps/pulse/tests/unit/swarm-retriever.test.ts
apps/pulse/tests/unit/wikipedia-crawl4ai-ingestion.test.ts
```

## PRH: residual route and type stabilization

```text
apps/pulse/app/api/menu/route.ts
apps/pulse/app/api/scheduling/route.ts
apps/pulse/app/api/tours/route.ts
apps/pulse/app/api/valuation/route.ts
```

Mechanical type corrections in those routes remain a later PRH concern; no current test path is assigned twice.

## Local planning state

```text
docs/
```

The staging and production-gated execution plan is recorded in `docs/sprint-2026-08-20/25-staging-and-production-gated-plan.md`.

The sprint packet is local planning state. It is intentionally uncommitted and contains no production data or secrets.

## Allocation result

- Every path in the inspected dirty worktree has an owning workstream or is explicitly marked local planning state.
- No `miscellaneous` bucket was used.
- The only known overlap is documented at the hunk level: `siteConfigStore.ts` may later be consumed by TenantContext, but remains owned by PRB for this dirty branch.
- Publication remains blocked until the user requests a path-aware checkpoint and the relevant workstream is split without discarding existing edits.
