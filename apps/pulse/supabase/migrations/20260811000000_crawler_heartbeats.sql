create table if not exists public.crawler_heartbeats (
  crawler_id text primary key,
  status text not null default 'unknown',
  updated_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.crawler_heartbeats enable row level security;

revoke all on public.crawler_heartbeats from anon, authenticated;
grant all on public.crawler_heartbeats to service_role;
