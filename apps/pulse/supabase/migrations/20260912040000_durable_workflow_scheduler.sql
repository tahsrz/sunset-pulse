-- Durable scheduler primitives. A schedule creates one job per occurrence;
-- delivery remains an explicit workflow-run operation.
CREATE TABLE IF NOT EXISTS public.workflow_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_key TEXT NOT NULL,
  time_zone TEXT NOT NULL DEFAULT 'America/Chicago',
  cadence TEXT NOT NULL DEFAULT 'hourly',
  enabled BOOLEAN NOT NULL DEFAULT true,
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, workflow_key)
);

ALTER TABLE public.workflow_schedules ADD COLUMN IF NOT EXISTS time_zone TEXT NOT NULL DEFAULT 'America/Chicago';
ALTER TABLE public.workflow_schedules ADD COLUMN IF NOT EXISTS cadence TEXT NOT NULL DEFAULT 'daily';
ALTER TABLE public.licensed_workflow_settings ADD COLUMN IF NOT EXISTS cadence TEXT NOT NULL DEFAULT 'daily';
ALTER TABLE public.licensed_workflow_settings ADD COLUMN IF NOT EXISTS time_zone TEXT NOT NULL DEFAULT 'America/Chicago';

CREATE TABLE IF NOT EXISTS public.workflow_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.workflow_schedules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_key TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed','cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0,
  lease_until TIMESTAMPTZ,
  run_id UUID REFERENCES public.licensed_workflow_runs(id) ON DELETE SET NULL,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (schedule_id, scheduled_for)
);

CREATE INDEX IF NOT EXISTS workflow_jobs_due_idx ON public.workflow_jobs(status, scheduled_for);
ALTER TABLE public.workflow_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages workflow schedules" ON public.workflow_schedules;
CREATE POLICY "Service role manages workflow schedules" ON public.workflow_schedules FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role manages workflow jobs" ON public.workflow_jobs;
CREATE POLICY "Service role manages workflow jobs" ON public.workflow_jobs FOR ALL TO service_role USING (true) WITH CHECK (true);
