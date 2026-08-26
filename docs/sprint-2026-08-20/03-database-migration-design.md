# Database Migration Design

This is a design artifact, not an applied migration. The executable SQL should be generated only after the regression fixtures and direct-client dependency audit are complete.

## Migration objectives

- Establish exact environment-scoped domain ownership.
- Make projection work transactional with the authoritative mutation.
- Track desired and applied manifest revisions.
- Provide atomic worker claims and stale-lease recovery.
- Remove public access to private `site_config` fields.
- Replace broad realtor/global RLS policies with tenant ownership where the schema supports it, and fail closed where it does not.

## Proposed tables

```sql
create table public.tenant_domains (
  id uuid primary key default gen_random_uuid(),
  site_config_id uuid not null references public.site_config(id) on delete cascade,
  hostname text not null,
  environment text not null check (environment in ('production', 'preview', 'development')),
  kind text not null check (kind in ('platform_subdomain', 'custom_domain', 'local_subdomain')),
  status text not null default 'pending_verification'
    check (status in ('pending_verification', 'pending_propagation', 'active', 'suspended', 'revoked')),
  revision bigint not null default 1 check (revision > 0),
  verification_method text,
  verification_token_hash text,
  verified_at timestamptz,
  verification_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (environment, hostname)
);

create index tenant_domains_site_environment_idx
  on public.tenant_domains (site_config_id, environment, status);
```

For phase one, `site_config.id` is the tenant scope UUID. Application `tenantId` values carry that UUID. Do not add a free-form compatibility `tenant_id`; it would have no authoritative foreign-key target. Do not duplicate `agent_id` into the domain row; load it through the referenced site config so the two identities cannot drift. If multi-site organizations become a product requirement, introduce an organization table and migrate this relation deliberately rather than overloading `agent_id`.

Hostname values must be normalized by a database function or validated before insertion. Add a check preventing schemes, ports, paths, commas, whitespace, uppercase, and trailing dots.

```sql
create table public.domain_manifest_outbox (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references public.tenant_domains(id) on delete cascade,
  environment text not null check (environment in ('production', 'preview', 'development')),
  operation text not null check (operation in ('upsert', 'remove', 'rebuild')),
  target_revision bigint not null check (target_revision > 0),
  state text not null default 'pending'
    check (state in ('pending', 'processing', 'retryable', 'succeeded', 'superseded', 'dead_lettered')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  lease_owner text,
  lease_expires_at timestamptz,
  last_error_code text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (domain_id, target_revision, operation)
);

create index domain_manifest_outbox_ready_idx
  on public.domain_manifest_outbox (state, next_attempt_at, created_at)
  where state in ('pending', 'retryable', 'processing');
```

```sql
create table public.domain_manifest_projection (
  domain_id uuid primary key references public.tenant_domains(id) on delete cascade,
  desired_revision bigint not null,
  applied_revision bigint,
  edge_config_version text,
  desired_at timestamptz not null default now(),
  applied_at timestamptz,
  last_checked_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);
```

## Mutation transaction

All domain mutations should call one security-definer function rather than independently updating tables.

```text
lock domain row
  -> validate expected revision
  -> update normalized domain state and revision
  -> upsert desired projection revision
  -> insert outbox operation
  -> commit
```

The function accepts `expected_revision` and raises a conflict if a stale admin page submits an older state.

## Worker claim function

Use the existing `FOR UPDATE SKIP LOCKED` pattern already present in `claim_notification_deliveries`.

Requirements:

- Reclaim `processing` rows only after `lease_expires_at`.
- Select only the latest nonterminal revision for each domain.
- Mark lower revisions `superseded` in the same transaction.
- Increment attempts at claim time.
- Return no more than a bounded batch.
- Restrict function execution to `service_role`.

The worker checks the current domain revision again before writing Edge Config. If the claimed revision is no longer current, it marks the job superseded without a remote write.

## Projection completion

Completion must update only when:

```text
domain_manifest_projection.desired_revision = claimed target revision
and tenant_domains.revision = claimed target revision
```

This prevents a delayed worker from reporting an obsolete revision as current.

## RLS design

Enable RLS on all three tables.

- `service_role`: full management.
- tenant owner: read domain and propagation status only through an owner-scoped policy joining `site_config.owner_id = auth.uid()`.
- operator/admin: management through server routes; avoid broad client-side mutation policies.
- anonymous: no access.

Projection tables contain operational details and remain service-role-only.

## Existing RLS remediation

The current migration history contains two risky policies:

1. `site_config` is publicly readable as a full row.
2. Realtor policies permit broad access to shared leads, workflows, tasks, collections, comments, and intelligence events.

Required remediation process:

1. Inventory every browser-side Supabase query against these tables.
2. Replace necessary public site reads with a typed public server projection or narrowly defined view/RPC.
3. Drop the full-row public `site_config` policy.
4. Add owner-scoped policies where an authoritative owner/agent relation exists.
5. Where no relation exists, remove realtor client access and use an authorized server route until migration is complete.

Do not add a permissive fallback policy merely to preserve old client behavior.

## Site configuration public projection

The public response may include:

- site and agent display names
- public branding
- public hero content
- public contact fields
- compliance text
- published section configuration
- assigned public listing identifiers

It must exclude:

- prompts and model matrix
- operational settings
- integration credentials or provider identifiers
- billing profile
- review notes
- owner identifiers
- last-modified operator details

Prefer a server-side typed projection. A database view is acceptable only if its security semantics are tested explicitly.

## Backfill

1. Normalize current `site_config.subdomain` into production platform-domain rows.
2. Normalize verified `custom_domain` values into production custom-domain rows.
3. Reject duplicate normalized hostnames and produce a manual conflict report.
4. Create projection rows with `desired_revision = revision`, `applied_revision = null`.
5. Enqueue one rebuild or upsert job per environment.
6. Keep existing columns during the compatibility window; do not drop them in this sprint.

## Migration verification queries

- Duplicate environment/hostname count is zero.
- Every active domain references an existing site config.
- Every active custom domain has `verified_at`.
- Every desired revision is greater than or equal to applied revision.
- No outbox row is processing with an expired lease after the repair worker runs.
- Anonymous cannot select from domain or projection tables.
- Realtor A cannot select Realtor B's tenant-owned rows.

## Rollback

The schema migration is additive. Rollback initially means disabling the new resolver feature flag and continuing to read `site_config.subdomain/custom_domain`.

Do not drop new tables during an incident. Preserve their state for diagnosis. A later cleanup migration can remove them after the old path is retired.

RLS rollback is separate and sensitive: restore only the minimum previous policy required for availability, never the broad public or all-realtor policy without an explicit security decision.
