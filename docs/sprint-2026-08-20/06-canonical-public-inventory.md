# Canonical Public Inventory Design

## Problem

The current normalized `Listing` type contains internal-capable fields such as `owner` and arbitrary `metadata`. Public safety is partly selected by callers through `publicOnly` options or the choice between `getListingById` and `getPublicListingById`.

The next boundary must make safe public behavior structurally difficult to bypass.

## Domain types

```ts
export type ListingId = Readonly<{
  canonicalId: string;
  mlsId: string | null;
}>;

export type PublicListing = Readonly<{
  id: string;
  mlsId: string | null;
  name: string;
  propertyType: string;
  publicRemarks: string;
  location: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
  };
  coordinates: [number, number] | null;
  beds: number | null;
  baths: number | null;
  squareFeet: number | null;
  price: number | null;
  priceType: 'sale' | 'lease' | 'unknown';
  amenities: readonly string[];
  images: readonly string[];
  status: string;
  updatedAt: string | null;
  attribution: {
    source: 'MLS' | 'Internal';
    disclaimer: string | null;
  };
}>;
```

There is no index signature and no arbitrary metadata. Adding a public field requires a schema and test change.

## Coordinate policy

Choose one policy explicitly:

- Exact coordinates for active listings only when MLS/public-display rules allow it.
- Fuzzed coordinates for general discovery and games.
- No coordinates for records with restrictions.

Do not fuzz inside the repository without returning a precision indicator. Consumers must know whether coordinates are exact.

```ts
coordinates: {
  value: [number, number] | null;
  precision: 'exact' | 'approximate' | 'none';
}
```

## Service interface

```ts
export interface PublicInventoryService {
  getById(input: {
    listingId: string;
    tenant?: TenantContext;
    purpose: 'detail' | 'metadata' | 'rent' | 'recon' | 'game';
  }): Promise<PublicListing | null>;

  search(input: {
    filters: PublicListingFilters;
    tenant?: TenantContext;
    purpose: 'global_search' | 'tenant_featured' | 'game';
    page: PublicPage;
  }): Promise<PublicListingPage>;
}
```

Tenant absence means explicitly global scope. It never means "tenant lookup failed, so use global."

## Visibility decision

```text
canonical row exists
  -> not deleted
  -> not demo
  -> display_public = true
  -> permitted listing status
  -> purpose-specific media/location requirements
  -> if tenant supplied: active tenant assignment exists
  -> map through PublicListing schema
```

Legacy Mongo fallback repeats every policy check and maps through the same projection. It cannot return the raw document.

## Tenant assignment model

A single listing can legitimately appear on multiple agent sites. Use a many-to-many relation rather than adding one site/tenant key to `properties`.

```sql
create table public.tenant_listing_assignments (
  id uuid primary key default gen_random_uuid(),
  site_config_id uuid not null references public.site_config(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  purpose text not null default 'inventory'
    check (purpose in ('inventory', 'featured', 'hot_list')),
  featured_rank integer,
  assigned_by uuid references auth.users(id),
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  unique (site_config_id, property_id, purpose)
);
```

`site_config.id` is the phase-one tenant scope UUID. MLS/provider identifiers are aliases used during deterministic backfill, not assignment authority. Ambiguous aliases are conflict rows and do not create assignments.

## Assignment authority

- Tenant owners can manage assignments only for their owned tenant through authorized server routes.
- Operators/admins can manage assignments with audit records.
- Anonymous users can never query the raw assignment table.
- Public inventory joins assignments through the service role/server boundary.

## Legacy transition

### Phase 1

- Introduce `PublicListing` projection and service.
- Keep existing allowlist as input.
- Backfill assignment rows from `integrationProfile.hotListMlsIds`.
- Compare results in tests and sampled offline checks.

### Phase 2

- Make assignment rows authoritative for tenant inventory.
- Continue writing the old allowlist for rollback compatibility.
- Expose assignment editing through launch-kit/admin tooling.

### Phase 3

- Stop reading the JSON allowlist.
- Remove dual write after discrepancy window reaches zero.
- Retire obsolete fields in a later migration.

## Canonical versus legacy reads

Canonical Supabase wins when both records exist. Legacy Mongo is compatibility fallback only.

Sample or batch reconciliation compares:

- visibility
- listing status
- price
- images
- coordinates
- update timestamp
- MLS ID linkage

Do not synchronously shadow-read every public request.

## Purpose-specific policies

### Detail and metadata

- Public and tenant-assigned when tenant scoped.
- Public remarks and compliant media only.

### Rent

- Same visibility check before external API use.
- Cache external results and apply public projection.

### Recon

Split contracts:

- `PublicRecon`: sanitized neighborhood context with no internal valuation model details.
- `AgentRecon`: authenticated tenant access with richer financial and engagement signals.

### Games

- Public records only.
- Sanitized/fuzzed location according to game rules.
- No metadata passthrough.

## Static enforcement

Add an import-boundary test or lint rule:

- Files under public API paths may import `publicInventory`, not `Property`.
- Unrestricted repository helpers live in a server-only internal module.
- `getListingById` is renamed `getInternalListingById`.

## Success criteria

- No anonymous route returns `Listing` directly.
- No public route imports Mongo `Property`.
- Tenant inventory is assignment-based.
- Every public payload validates against `PublicListing`.
- Negative fixture matrix passes against canonical and legacy paths.
