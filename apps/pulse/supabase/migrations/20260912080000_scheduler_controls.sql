CREATE OR REPLACE FUNCTION public.claim_workflow_jobs(p_limit INTEGER, p_lease_seconds INTEGER DEFAULT 300)
RETURNS SETOF public.workflow_jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT id FROM public.workflow_jobs
    WHERE status = 'queued' AND scheduled_for <= now() AND attempts < 3
    ORDER BY scheduled_for FOR UPDATE SKIP LOCKED LIMIT p_limit
  )
  UPDATE public.workflow_jobs j SET status = 'running', attempts = j.attempts + 1,
    lease_until = now() + make_interval(secs => p_lease_seconds), updated_at = now()
  FROM candidates c WHERE j.id = c.id RETURNING j.*;
END; $$;

CREATE OR REPLACE FUNCTION public.recover_workflow_leases()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE recovered INTEGER;
BEGIN
  UPDATE public.workflow_jobs SET status = CASE WHEN attempts >= 3 THEN 'failed' ELSE 'queued' END, lease_until = NULL, error = CASE WHEN attempts >= 3 THEN 'Maximum retry attempts exceeded.' ELSE error END, updated_at = now()
  WHERE status = 'running' AND lease_until < now();
  GET DIAGNOSTICS recovered = ROW_COUNT;
  RETURN recovered;
END; $$;

CREATE OR REPLACE FUNCTION public.pause_workflow_schedule(p_schedule_id UUID, p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE changed BOOLEAN;
BEGIN UPDATE public.workflow_schedules SET enabled = false, updated_at = now() WHERE id = p_schedule_id AND user_id = p_user_id RETURNING true INTO changed; RETURN COALESCE(changed, false); END; $$;

CREATE OR REPLACE FUNCTION public.resume_workflow_schedule(p_schedule_id UUID, p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE changed BOOLEAN;
BEGIN UPDATE public.workflow_schedules SET enabled = true, updated_at = now() WHERE id = p_schedule_id AND user_id = p_user_id RETURNING true INTO changed; RETURN COALESCE(changed, false); END; $$;

ALTER TABLE public.workflow_schedules ADD COLUMN IF NOT EXISTS local_hour INTEGER NOT NULL DEFAULT 8 CHECK (local_hour BETWEEN 0 AND 23);
ALTER TABLE public.workflow_schedules ADD COLUMN IF NOT EXISTS local_minute INTEGER NOT NULL DEFAULT 0 CHECK (local_minute BETWEEN 0 AND 59);
ALTER TABLE public.licensed_workflow_settings ADD COLUMN IF NOT EXISTS local_hour INTEGER NOT NULL DEFAULT 8 CHECK (local_hour BETWEEN 0 AND 23);
ALTER TABLE public.licensed_workflow_settings ADD COLUMN IF NOT EXISTS local_minute INTEGER NOT NULL DEFAULT 0 CHECK (local_minute BETWEEN 0 AND 59);
