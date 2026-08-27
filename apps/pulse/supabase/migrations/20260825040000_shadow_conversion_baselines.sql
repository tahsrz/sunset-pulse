create table if not exists public.shadow_conversion_baselines (
  id uuid primary key default gen_random_uuid(),
  tenant_site text not null unique,
  window_start timestamptz not null,
  window_end timestamptz not null,
  handoff_percent numeric not null check (handoff_percent >= 0),
  appointment_percent numeric not null check (appointment_percent >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shadow_conversion_baselines_window_order check (window_end > window_start)
);
