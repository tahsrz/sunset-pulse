# Direct Supabase Dependency Inventory

Date: 2026-08-20

## Purpose

This inventory identifies browser and public-server dependencies that must be removed before broad `site_config` and realtor-role policies can be tightened. It records code paths and replacement boundaries, not customer data or environment values.

## `site_config` browser boundary

The following direct browser dependencies were removed during the local TC-02 adapter stage:

| Previous consumer | Previous access | Replacement |
|---|---|---|
| `context/ThemeProvider.tsx` | Full-row Realtime UPDATE payload | Server-rendered initial theme; refresh/navigation is the compatibility update path until a typed public projection event exists |
| `app/admin/prompts/page.tsx` | Full-row read and direct upsert | Authenticated `/api/admin/prompts` GET/POST with bounded response and strict mutation schema |
| `app/admin/intelligence/page.tsx` | Direct `site_config.intelligence` update | Authenticated `/api/admin/intelligence` POST with a strict grill-intelligence schema |

The static `tenant-client-data-boundary.test.ts` now fails if a client component contains a `site_config` dependency.

## Remaining `site_config` server paths

These are not browser database clients, but they still matter before the anonymous full-row policy is removed:

| Consumer | Client/authority | Current risk | Required replacement |
|---|---|---|---|
| `app/layout.tsx` | Cookie-aware server Supabase client; `select('*')` | Anonymous render depends on broad public policy; agent scope comes from compatibility headers | Typed public site projection loaded after authoritative host resolution |
| `lib/ai/jamie.ts` | Cookie-aware server Supabase client; `select('*')` | Public Jamie can require anonymous policy for private prompt/model fields | Service-only bounded config loader receiving authoritative TenantContext/agent identity |
| `app/api/properties/[id]/recon/route.ts` | Cookie-aware server client for aggregate event counts only | Tenant-specific config selection is now disabled until authoritative context exists; the route uses neutral defaults | TC-03 host resolver; then service-only bounded site lookup |
| `lib/sites/siteProfiles.ts` | `supabaseAdmin`, explicit columns | Server-only but still accepts an agent ID compatibility key | Pass authoritative identity explicitly when tenant routes migrate |
| `lib/sites/siteData.ts` | `supabaseAdmin`, full row | Server-only and used for rich site assembly | Split typed public and operator projections |
| `lib/sites/siteConfigStore.ts` | `supabaseAdmin`, full rows | Intended internal configuration store | Keep server-only; add typed adapter outputs over time |
| Operator/notification modules | `supabaseAdmin`, bounded or operator-gated | No anonymous RLS dependency | Retain server boundary and add tenant ownership predicates |

No public RLS policy should be changed until the first three compatibility paths are migrated and anonymous probes are executable.

## TC-03 adapter preparation

`lib/tenancy/supabaseTenantDomainRegistry.ts` now contains a server-only, exact `(environment, hostname)` adapter for the proposed `tenant_domains` relation. It selects only the domain identity and the bounded publication fields needed by `TenantContext`, maps relation mismatches to a typed dependency error, and refuses to run without `SUPABASE_SERVICE_ROLE_KEY`.

The adapter is intentionally not wired into layout, Jamie, or recon yet. The migration design does not currently provide a dedicated publication revision, so the mapper accepts the domain revision as a temporary compatibility fallback while preferring `site_config.publication_revision` when present. The schema gate must settle that field before production activation.

## Remaining sensitive browser dependencies

The golden static inventory currently records:

| Table | Browser consumers | Migration action |
|---|---|---|
| `leads` | `components/LeadPipelineBoard.tsx` | Load a tenant-scoped, operator-authorized projection from the existing admin API |
| `tasks` | `components/JamieSprintDashboard.jsx`, universal Realtime helper | Add an authenticated sprint-task endpoint and use Realtime only as an invalidation signal |
| `intelligence_events` | `components/IntelligenceTimeline.jsx`, universal Realtime helper | Use a bounded authorized timeline endpoint; never stream the global table directly |
| `collections` | `hooks/usePropertyInteraction.ts`, universal helper | Finish routing reads through `/api/collections`; retain user ownership checks server-side |
| `property_comments` | `hooks/usePropertyInteraction.ts`, universal helper | Add a property-scoped comments API and an authorized/invalidation-only stream |
| `daily_briefings` | `context/JamiePulseContext.tsx` | Publish a typed public briefing projection or server endpoint before tightening its policy |

The universal `lib/supabase.js` module is included in the golden inventory because it is imported into client bundles even though it does not declare `use client` itself.

## Migration order

1. Keep the new no-client-`site_config` regression green.
2. Apply the explicit `PublicListing` projection to public detail responses before migrating more route surfaces.
3. Migrate layout, Jamie, and recon to authoritative host-derived context plus bounded server projections.
4. Run Q01-Q08 and anonymous/two-JWT probes in staging.
5. Remove anonymous full-row `site_config` access.
6. Replace direct broad-table clients one table at a time, beginning with global `intelligence_events` and `leads` reads.
7. Tighten realtor policies only after each replacement endpoint and cross-tenant test is green.

## Current conclusion

Direct browser access to `site_config` is no longer required by checked-in client components. The anonymous database policy is still required by three compatibility server paths, so the production RLS migration remains correctly blocked.
