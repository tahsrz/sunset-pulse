# Migration and RLS Query Catalog

This catalog is the read-only evidence pack for the TenantContext migration. Run it against a scrubbed local database first, then staging, then production before any mutating migration. Save counts and query plans with the release record; never save row contents containing customer data or secrets.

## Operating rules

- Preflight queries are read-only.
- Run with an operator connection that can inspect policies, but repeat authorization probes through the real anonymous and authenticated clients.
- Record environment, migration version, timestamp, row counts, and query duration.
- A failed invariant blocks rollout. Do not repair data ad hoc from the SQL editor without a reviewed remediation script.
- Treat missing expected tables or columns as a failed preflight, not as zero rows.

## Q01: Applied migration inventory

```sql
select version, name
from supabase_migrations.schema_migrations
order by version;
```

Evidence:

- Local, preview, and production migration sets are explicitly compared.
- `20260818010000_agent_site_lead_idempotency.sql` is either applied everywhere intended or deliberately excluded with an owner and date.

## Q02: Current RLS posture

```sql
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  permissive,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'site_config',
    'properties',
    'leads',
    'intelligence_events',
    'collections',
    'property_comments',
    'workflows',
    'sprints',
    'tasks',
    'tenant_domains',
    'domain_manifest_outbox',
    'domain_manifest_projection',
    'tenant_listing_assignments'
  )
order by tablename, policyname;
```

Blockers:

- Anonymous full-row access to `site_config` remains after the public projection is live.
- A realtor role can read all tenant rows without an owner, membership, or assignment predicate.
- An operational outbox or projection table is readable by anonymous or ordinary authenticated roles.

## Q03: RLS enablement and force status

```sql
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'site_config',
    'properties',
    'leads',
    'intelligence_events',
    'tenant_domains',
    'domain_manifest_outbox',
    'domain_manifest_projection',
    'tenant_listing_assignments'
  )
order by c.relname;
```

Expected: RLS is enabled for every browser-reachable table. Service-role bypass is an explicit server privilege, not a permissive policy.

## Q04: Sensitive `site_config` column inventory

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'site_config'
order by ordinal_position;
```

Review every returned column against the public projection allow-list. At minimum, prompts, model configuration, operational settings, billing, provider integration data, owner IDs, and review notes are private.

## Q05: Site identity completeness

```sql
select
  count(*) as total_sites,
  count(*) filter (where owner_id is null) as ownerless_sites,
  count(*) filter (where nullif(trim(agent_id), '') is null) as missing_agent_ids,
  count(*) filter (where nullif(trim(subdomain), '') is null
                    and nullif(trim(custom_domain), '') is null) as sites_without_domain
from public.site_config;
```

Ownerless or identity-less rows require an explicit disposition before owner-scoped RLS can replace global realtor reads.

## Q06: Duplicate normalized platform subdomains

```sql
select lower(trim(trailing '.' from trim(subdomain))) as normalized_subdomain,
       count(*) as row_count,
       array_agg(id order by id) as conflicting_site_ids
from public.site_config
where nullif(trim(subdomain), '') is not null
group by lower(trim(trailing '.' from trim(subdomain)))
having count(*) > 1
order by row_count desc;
```

Expected: zero rows. Store only the count in ordinary build artifacts; the ID list belongs in restricted migration evidence.

## Q07: Duplicate normalized custom domains

```sql
select lower(trim(trailing '.' from trim(custom_domain))) as normalized_hostname,
       count(*) as row_count,
       array_agg(id order by id) as conflicting_site_ids
from public.site_config
where nullif(trim(custom_domain), '') is not null
group by lower(trim(trailing '.' from trim(custom_domain)))
having count(*) > 1
order by row_count desc;
```

Expected: zero rows. A duplicate is a manual ownership conflict, never a last-write-wins backfill.

## Q08: Invalid legacy hostname shapes

```sql
with candidate_hosts as (
  select id, 'subdomain'::text as source, subdomain as hostname
  from public.site_config
  where nullif(trim(subdomain), '') is not null
  union all
  select id, 'custom_domain'::text, custom_domain
  from public.site_config
  where nullif(trim(custom_domain), '') is not null
)
select source, count(*) as invalid_count
from candidate_hosts
where hostname <> lower(hostname)
   or hostname <> trim(hostname)
   or hostname like '%. '
   or hostname ~ '[/:,[:space:]]'
group by source;
```

The executable migration must use the same normalization contract as application code. This query is a warning inventory, not the final validator.

## Q09: Backfill coverage after `tenant_domains`

```sql
select
  count(*) as total_sites,
  count(*) filter (where td.id is null) as sites_without_domain_row
from public.site_config sc
left join public.tenant_domains td
  on td.site_config_id = sc.id
 and td.environment = 'production'
 and td.status <> 'revoked';
```

Expected: zero unexplained active/published sites without a production domain row.

## Q10: Domain uniqueness and referential integrity

```sql
select environment, hostname, count(*) as row_count
from public.tenant_domains
group by environment, hostname
having count(*) > 1;

select count(*) as orphan_domain_count
from public.tenant_domains td
left join public.site_config sc on sc.id = td.site_config_id
where sc.id is null;
```

Expected: both queries return zero conflicts.

## Q11: Domain lifecycle invariants

```sql
select
  count(*) filter (
    where kind = 'custom_domain'
      and status in ('active', 'pending_propagation')
      and verified_at is null
  ) as unverified_live_custom_domains,
  count(*) filter (
    where status = 'active'
      and verification_expires_at is not null
      and verification_expires_at <= now()
  ) as expired_active_domains,
  count(*) filter (where revision <= 0) as invalid_revisions
from public.tenant_domains;
```

Expected: all counts are zero.

## Q12: Desired/applied manifest drift

```sql
select
  count(*) filter (where applied_revision is null) as never_applied,
  count(*) filter (where applied_revision > desired_revision) as impossible_ahead,
  count(*) filter (where applied_revision < desired_revision) as pending_drift,
  max(now() - desired_at) filter (where applied_revision is distinct from desired_revision)
    as oldest_drift_age
from public.domain_manifest_projection;
```

Release expectations:

- `impossible_ahead = 0` always.
- Pending drift is acceptable only within the propagation SLO.
- `never_applied` is zero for active production domains after worker convergence.

## Q13: Outbox health

```sql
select state, count(*) as jobs, min(created_at) as oldest_created_at
from public.domain_manifest_outbox
group by state
order by state;

select count(*) as expired_processing_leases
from public.domain_manifest_outbox
where state = 'processing'
  and lease_expires_at < now();

select domain_id, count(*) as live_revisions
from public.domain_manifest_outbox
where state in ('pending', 'processing', 'retryable')
group by domain_id
having count(*) > 1;
```

The final query can temporarily return multiple revisions before supersession. After a claim/repair cycle, only the newest nonterminal revision may remain live.

## Q14: Listing assignment integrity

The final table shape is confirmed during the schema spike. The invariant query must prove:

```sql
select site_config_id, property_id, purpose, count(*)
from public.tenant_listing_assignments
where revoked_at is null
group by site_config_id, property_id, purpose
having count(*) > 1;
```

Additional required counts:

- assignments referencing a missing tenant/site: zero
- assignments referencing a missing canonical listing: zero
- public assignments whose listing is not public-safe: zero
- expired assignments still returned by the public repository: zero in integration tests

## Q15: Lead and intelligence tenant coverage

```sql
select
  count(*) as total_leads,
  count(*) filter (where nullif(trim(agent_id), '') is null) as leads_without_agent,
  count(*) filter (where site_id is null) as leads_without_site
from public.leads;

select
  count(*) as total_events,
  count(*) filter (where nullif(trim(agent_id), '') is null) as events_without_agent,
  count(*) filter (where nullif(trim(session_id), '') is null) as events_without_session
from public.intelligence_events;
```

Column names must be reconciled to the actual schema before execution. The goal is to identify rows that cannot yet participate in authoritative tenant joins.

## Q16: Index viability

Run `explain (analyze, buffers, format text)` in staging with production-like volume for:

- exact `(environment, hostname)` resolution
- owner-to-site lookup
- tenant/publication-to-listing assignment lookup
- ready outbox claim ordered by `next_attempt_at, created_at`
- latest tenant lead queue by intelligence score and recency

Do not run `analyze` queries against production during peak traffic without an operator-approved window. Baseline targets are in the observability plan.

## Q17: Anonymous authorization probes

SQL catalog inspection does not prove request behavior. Through the actual anonymous Supabase client and public HTTP routes, assert:

1. Full `site_config` rows cannot be selected.
2. Public site projection returns only allow-listed fields.
3. Tenant/domain/outbox/projection tables return no rows or authorization failure.
4. Private, draft, suppressed, expired, and cross-tenant listings return 404.
5. Browser-supplied `x-sunset-*`, forwarded host, tenant ID, agent ID, and listing visibility flags do not change scope.

## Q18: Authenticated cross-tenant probes

Using two fixture users and two tenants:

- Owner A can read Tenant A administration state.
- Owner A cannot read or mutate Tenant B site, leads, events, assignments, domain state, or projection status.
- A platform operator can perform only the explicitly granted server-side operation.
- Removing a membership or assignment revokes access immediately after the documented cache interval.

These are integration tests executed with real JWT claims. A service-role test cannot substitute for them.

## Release evidence template

| Field | Value |
|---|---|
| Environment | |
| Database migration version | |
| Git SHA | |
| Started / completed | |
| Operator | |
| Q01-Q08 preflight result | |
| Backfill dry-run counts | |
| Q09-Q16 postflight result | |
| Anonymous matrix run | |
| Cross-tenant matrix run | |
| Exceptions and owner | |
| Rollback decision | |

## Hard stop conditions

- Any normalized hostname collision.
- Any public path can select private site configuration.
- Any cross-tenant read or mutation succeeds.
- Any active custom domain lacks verified ownership.
- The backfill would silently guess tenant ownership.
- The production query plan performs an unbounded sequential scan on the hot resolver or assignment path.
- Applied projection revision is ahead of desired revision.
