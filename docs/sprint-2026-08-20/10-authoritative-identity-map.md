# Authoritative Identity Map

## Purpose

Sunset Pulse currently represents identity through hostnames, slugs, site configs, agent IDs, Supabase users, Mongo owners, sessions, leads, events, MLS IDs, and canonical property IDs. This document names the authority and verification rule for each mapping.

## Identity relationships

| Mapping | Authoritative source | Resolver | Browser input allowed? | Failure behavior |
|---|---|---|---|---|
| hostname -> domain | `tenant_domains(environment, hostname)` | `resolveDomain` | Host is input, never authority | 404/503 |
| domain -> tenant scope | `tenant_domains.site_config_id` at current revision | `resolveTenantIdentity` | no | 404 |
| tenant -> site config | `tenant_domains.site_config_id` | `loadTenantSiteConfig` | no | 404/503 |
| site config -> agent | `site_config.agent_id` | `resolveTenantIdentity` | no | 404 |
| user -> owned agent/site | `site_config.owner_id` plus profile role | `resolveTenantAccess` | requested agent is only a selector | 403 |
| tenant -> publication | site status + review + billing entitlement | `resolveTenantPublication` | no | 404 public / 403 admin |
| tenant scope -> listing | `tenant_listing_assignments.site_config_id` | `publicInventory` | listing ID is lookup input | 404 |
| MLS ID -> canonical listing | `properties.mls_id` | canonical listing adapter | lookup input | null/404 |
| canonical ID -> listing | `properties.id` | canonical listing adapter | lookup input | null/404 |
| legacy Mongo ID -> listing | Mongo compatibility adapter | legacy listing adapter | lookup input | null/404 |
| global session -> visitor | signed HTTP-only session cookie/server session record | visitor session resolver | cookie transport only | anonymous new session or reject |
| session -> lead | `agent_site_leads` authoritative linkage | lead context resolver | no direct lead authority | unmatched anonymous context |
| intelligence event -> lead | verified session/lead relation | alert enrichment | metadata is hint only | suppress/unresolved |
| lead -> agent/tenant | `agent_site_leads.agent_id` plus site relation | alert/lead service | no | suppress/403 |
| notification -> agent | persisted notification `agent_id` verified against lead/event | notification service | no | suppress/dead letter |
| Stripe checkout -> site owner | Stripe session metadata/client reference verified server-side | onboarding service | session ID lookup only | reject |
| subscription -> entitlement | stored subscription pointer + Stripe state | entitlement service | no | blocked/unlinked |
| cartridge manifest -> content | immutable manifest version + checksum | Atlas hydrator | query chooses corpus, not raw path | previous known-good/unavailable |

## Forbidden authority sources

Never authorize from:

- `agentId` in request JSON
- `tenant` or `site` query parameter
- `personaMode`, `isDevMode`, or memory context from Jamie clients
- `x-sunset-*` supplied by the browser
- arbitrary `x-forwarded-host` without verified proxy mode
- alert `metadata.agentId` without lead/site verification
- Mongo owner IDs presented by another user
- Stripe customer search when the stored subscription pointer is missing
- process-global flags in serverless instances

## Current independent identity consumers

The sprint must audit or migrate these groups:

### Tenant/public surfaces

- middleware and tenant page
- app layout site config
- public lead route
- Jamie guide and guide events
- featured/hot-list/recon
- visitor session host normalization

### Agent/admin surfaces

- agent lead routes and actions
- alert and notification stores
- admin site review and launch kit
- prompts/branding/intelligence pages with hard-coded default agent IDs

### AI surfaces

- Jamie site config lookup
- Jamie development update path
- TensorZero/Jamie backbone
- command-center agents using listing or TAH context

### Legacy/internal property surfaces

- bookmarks and collections
- bookings
- lead processor
- evaluator/property recon
- viral factory

Not every internal property read should use public inventory. Each must declare its actor and required capability.

## Identity revision strategy

Each mutable relationship needs a revision or updated timestamp suitable for cache invalidation:

- domain revision
- site configuration revision
- publication/entitlement revision
- tenant-listing assignment revision or updated timestamp
- lead updated timestamp
- cartridge manifest version

A composite `TenantContext` cache key should include domain and publication revision. Listing caches additionally include assignment revision or a tenant assignment cache tag.

## Architecture record requirement

Any new feature adding another persistent identity must document:

- identifier format
- authoritative table/store
- ownership relation
- browser representation
- server verifier
- cache key
- deletion/merge behavior
- audit behavior
