-- Atomic domain-manifest worker coordination.

create or replace function public.claim_domain_manifest_outbox(
  p_worker text,
  p_limit integer default 10,
  p_lease_seconds integer default 120
)
returns setof public.domain_manifest_outbox
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_worker is null or length(trim(p_worker)) = 0 then
    raise exception 'worker identity is required';
  end if;

  return query
  with expired as (
    update public.domain_manifest_outbox
       set state = 'retryable', lease_owner = null, lease_expires_at = null,
           next_attempt_at = now(), updated_at = now()
     where state = 'processing' and lease_expires_at < now()
     returning id
  ), latest as (
    select o.id,
           row_number() over (partition by o.domain_id order by o.target_revision desc, o.created_at desc) as rank
      from public.domain_manifest_outbox o
     where o.state in ('pending', 'retryable')
       and o.next_attempt_at <= now()
  ), superseded as (
    update public.domain_manifest_outbox o
       set state = 'superseded', updated_at = now(), completed_at = now()
      from latest l
     where o.id = l.id and l.rank > 1
     returning o.id
  ), claimed as (
    select o.id
      from public.domain_manifest_outbox o
      join latest l on l.id = o.id
     where l.rank = 1
     order by o.created_at
     limit greatest(1, least(p_limit, 100))
     for update skip locked
  )
  update public.domain_manifest_outbox o
     set state = 'processing', attempts = o.attempts + 1,
         lease_owner = p_worker,
         lease_expires_at = now() + make_interval(secs => greatest(10, least(p_lease_seconds, 900))),
         updated_at = now()
    from claimed c
   where o.id = c.id
   returning o.*;
end;
$$;

revoke all on function public.claim_domain_manifest_outbox(text, integer, integer) from public;
grant execute on function public.claim_domain_manifest_outbox(text, integer, integer) to service_role;

create or replace function public.complete_domain_manifest_outbox(
  p_outbox_id uuid,
  p_worker text,
  p_edge_config_version text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  job public.domain_manifest_outbox;
begin
  select * into job
    from public.domain_manifest_outbox
   where id = p_outbox_id
     and state = 'processing'
     and lease_owner = p_worker
   for update;

  if not found then return false; end if;

  update public.domain_manifest_outbox
     set state = 'succeeded', completed_at = now(), lease_owner = null,
         lease_expires_at = null, last_error = null, last_error_code = null,
         updated_at = now()
   where id = job.id;

  update public.domain_manifest_projection
     set applied_revision = job.target_revision,
         edge_config_version = p_edge_config_version,
         applied_at = now(), last_checked_at = now(), last_error = null,
         updated_at = now()
   where domain_id = job.domain_id
     and desired_revision = job.target_revision
     and exists (
       select 1 from public.tenant_domains d
        where d.id = job.domain_id and d.revision = job.target_revision
     );

  return true;
end;
$$;

revoke all on function public.complete_domain_manifest_outbox(uuid, text, text) from public;
grant execute on function public.complete_domain_manifest_outbox(uuid, text, text) to service_role;
