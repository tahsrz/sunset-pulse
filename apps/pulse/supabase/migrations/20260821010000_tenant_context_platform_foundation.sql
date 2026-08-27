-- Additive tenant identity and projection foundation.
-- Existing site_config rows are preserved. Only explicitly eligible domains
-- and assignments should be backfilled after the staging rehearsal.

create table if not exists public.tenant_domains (
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
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hostname),
  check (hostname = lower(hostname)),
  check (hostname = trim(hostname)),
  check (hostname not like '%.')
);

create index if not exists tenant_domains_site_environment_idx
  on public.tenant_domains (site_config_id, environment, status);

create table if not exists public.domain_manifest_outbox (
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
  unique (domain_id, target_revision)
);

create index if not exists domain_manifest_outbox_ready_idx
  on public.domain_manifest_outbox (state, next_attempt_at, created_at)
  where state in ('pending', 'retryable', 'processing');

create table if not exists public.domain_manifest_projection (
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

create table if not exists public.tenant_listing_assignments (
  id uuid primary key default gen_random_uuid(),
  site_config_id uuid not null references public.site_config(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  purpose text not null default 'inventory'
    check (purpose in ('inventory', 'featured', 'hot_list', 'preview')),
  status text not null default 'active'
    check (status in ('active', 'expired', 'revoked')),
  revision bigint not null default 1 check (revision > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_config_id, property_id, purpose)
);

create index if not exists tenant_listing_assignments_lookup_idx
  on public.tenant_listing_assignments (site_config_id, purpose, status, property_id);

create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_tenant_domains_updated_at on public.tenant_domains;
create trigger set_tenant_domains_updated_at before update on public.tenant_domains
for each row execute function public.handle_updated_at();
drop trigger if exists set_domain_manifest_outbox_updated_at on public.domain_manifest_outbox;
create trigger set_domain_manifest_outbox_updated_at before update on public.domain_manifest_outbox
for each row execute function public.handle_updated_at();
drop trigger if exists set_domain_manifest_projection_updated_at on public.domain_manifest_projection;
create trigger set_domain_manifest_projection_updated_at before update on public.domain_manifest_projection
for each row execute function public.handle_updated_at();
drop trigger if exists set_tenant_listing_assignments_updated_at on public.tenant_listing_assignments;
create trigger set_tenant_listing_assignments_updated_at before update on public.tenant_listing_assignments
for each row execute function public.handle_updated_at();

alter table public.tenant_domains enable row level security;
alter table public.domain_manifest_outbox enable row level security;
alter table public.domain_manifest_projection enable row level security;
alter table public.tenant_listing_assignments enable row level security;

drop policy if exists tenant_domains_owner_read on public.tenant_domains;
create policy tenant_domains_owner_read on public.tenant_domains for select to authenticated using (exists (
  select 1 from public.site_config sc where sc.id = tenant_domains.site_config_id and sc.owner_id = auth.uid()
));
drop policy if exists tenant_domains_service_all on public.tenant_domains;
create policy tenant_domains_service_all on public.tenant_domains for all to service_role using (true) with check (true);
drop policy if exists tenant_listing_assignments_owner_read on public.tenant_listing_assignments;
create policy tenant_listing_assignments_owner_read on public.tenant_listing_assignments for select to authenticated using (exists (
  select 1 from public.site_config sc where sc.id = tenant_listing_assignments.site_config_id and sc.owner_id = auth.uid()
));
drop policy if exists tenant_listing_assignments_service_all on public.tenant_listing_assignments;
create policy tenant_listing_assignments_service_all on public.tenant_listing_assignments for all to service_role using (true) with check (true);
drop policy if exists domain_manifest_outbox_service_all on public.domain_manifest_outbox;
create policy domain_manifest_outbox_service_all on public.domain_manifest_outbox for all to service_role using (true) with check (true);
drop policy if exists domain_manifest_projection_service_all on public.domain_manifest_projection;
create policy domain_manifest_projection_service_all on public.domain_manifest_projection for all to service_role using (true) with check (true);
