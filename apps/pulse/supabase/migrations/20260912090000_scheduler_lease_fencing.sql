ALTER TABLE public.workflow_jobs ADD COLUMN IF NOT EXISTS lease_token UUID;
ALTER TABLE public.workflow_schedules ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION public.claim_workflow_jobs(p_limit INTEGER, p_lease_seconds INTEGER DEFAULT 300)
RETURNS SETOF public.workflow_jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT id FROM public.workflow_jobs WHERE status = 'queued' AND scheduled_for <= now() AND attempts < 3
    ORDER BY scheduled_for FOR UPDATE SKIP LOCKED LIMIT p_limit
  )
  UPDATE public.workflow_jobs j SET status = 'running', attempts = j.attempts + 1,
    lease_until = now() + make_interval(secs => p_lease_seconds), lease_token = gen_random_uuid(), updated_at = now()
  FROM candidates c WHERE j.id = c.id RETURNING j.*;
END; $$;

CREATE OR REPLACE FUNCTION public.recover_workflow_leases()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE recovered INTEGER;
BEGIN
  UPDATE public.workflow_jobs SET status = CASE WHEN attempts >= 3 THEN 'failed' ELSE 'queued' END,
    lease_until = NULL, lease_token = NULL, error = CASE WHEN attempts >= 3 THEN 'Maximum retry attempts exceeded.' ELSE error END, updated_at = now()
  WHERE status = 'running' AND lease_until < now();
  GET DIAGNOSTICS recovered = ROW_COUNT;
  RETURN recovered;
END; $$;
