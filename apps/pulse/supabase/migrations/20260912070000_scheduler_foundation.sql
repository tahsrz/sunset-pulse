-- Shared scheduler result and atomic claim primitives.
CREATE TABLE IF NOT EXISTS public.workflow_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL UNIQUE REFERENCES public.workflow_jobs(id) ON DELETE CASCADE,
  workflow_key TEXT NOT NULL,
  result_type TEXT NOT NULL,
  result_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.claim_workflow_jobs(p_limit INTEGER, p_lease_seconds INTEGER DEFAULT 300)
RETURNS SETOF public.workflow_jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT id FROM public.workflow_jobs
    WHERE status = 'queued' AND scheduled_for <= now()
    ORDER BY scheduled_for FOR UPDATE SKIP LOCKED LIMIT p_limit
  )
  UPDATE public.workflow_jobs j
  SET status = 'running', attempts = j.attempts + 1,
      lease_until = now() + make_interval(secs => p_lease_seconds), updated_at = now()
  FROM candidates c WHERE j.id = c.id RETURNING j.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.recover_workflow_leases()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE recovered INTEGER;
BEGIN
  UPDATE public.workflow_jobs SET status = 'queued', lease_until = NULL, updated_at = now()
  WHERE status = 'running' AND lease_until < now();
  GET DIAGNOSTICS recovered = ROW_COUNT;
  RETURN recovered;
END;
$$;
