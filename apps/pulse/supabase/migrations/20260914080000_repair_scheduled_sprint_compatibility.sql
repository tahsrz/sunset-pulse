-- Repair databases that already applied 20260912060000 before the legacy
-- public.sprints shape was recognized. This is deliberately additive: legacy
-- workflow rows keep their IDs, links and nullable ownership; new scheduled
-- rows must supply owner_id through the owner-authenticated services.
ALTER TABLE public.sprints
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS goal TEXT,
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_job_id UUID REFERENCES public.workflow_jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS sprints_owner_status_idx
  ON public.sprints(owner_id, status, created_at DESC);
