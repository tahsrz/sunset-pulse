-- Package A8: route scheduled execution through a registry and make pause and
-- explicit worker failures obey the same durable retry rules.

-- A paused schedule may still have queued rows. The schedule join below keeps
-- those rows durable without allowing a new worker claim until it is resumed.
CREATE OR REPLACE FUNCTION public.claim_workflow_jobs(
  p_limit INTEGER,
  p_lease_seconds INTEGER DEFAULT 300
)
RETURNS SETOF public.workflow_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'Workflow claim limit must be between 1 and 100.';
  END IF;

  IF p_lease_seconds IS NULL OR p_lease_seconds < 30 OR p_lease_seconds > 900 THEN
    RAISE EXCEPTION 'Workflow lease must be between 30 and 900 seconds.';
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT job.id
    FROM public.workflow_jobs AS job
    JOIN public.workflow_schedules AS schedule
      ON schedule.id = job.schedule_id
     AND schedule.user_id = job.user_id
     AND schedule.workflow_key = job.workflow_key
    WHERE job.status = 'queued'
      AND schedule.enabled = true
      AND job.scheduled_for <= now()
      AND (job.retry_at IS NULL OR job.retry_at <= now())
      AND job.attempts < 3
    ORDER BY job.scheduled_for, job.id
    FOR UPDATE OF job SKIP LOCKED
    LIMIT p_limit
  )
  UPDATE public.workflow_jobs AS job
  SET status = 'running',
      attempts = job.attempts + 1,
      lease_until = now() + make_interval(secs => p_lease_seconds),
      lease_token = gen_random_uuid(),
      retry_at = NULL,
      updated_at = now()
  FROM candidates
  WHERE job.id = candidates.id
  RETURNING job.*;
END;
$$;

-- Resolve failures from the worker itself using the same bounded backoff as
-- lease recovery: attempt 1 -> one minute, attempt 2 -> five minutes, and
-- attempt 3 -> terminal failure. A stale worker receives no state transition.
CREATE OR REPLACE FUNCTION public.resolve_workflow_failure(
  p_job_id UUID,
  p_lease_token UUID,
  p_error TEXT
)
RETURNS TABLE(status TEXT, retry_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  locked_job public.workflow_jobs%ROWTYPE;
  next_retry_at TIMESTAMPTZ;
BEGIN
  IF p_job_id IS NULL OR p_lease_token IS NULL THEN
    RETURN QUERY SELECT 'stale'::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  SELECT *
  INTO locked_job
  FROM public.workflow_jobs
  WHERE id = p_job_id
  FOR UPDATE;

  IF NOT FOUND
    OR locked_job.status <> 'running'
    OR locked_job.lease_token IS DISTINCT FROM p_lease_token THEN
    RETURN QUERY SELECT 'stale'::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  IF locked_job.attempts >= 3 THEN
    UPDATE public.workflow_jobs
    SET status = 'failed',
        lease_until = NULL,
        lease_token = NULL,
        retry_at = NULL,
        error = LEFT(COALESCE(NULLIF(btrim(p_error), ''), 'Workflow failed.'), 4000),
        updated_at = now()
    WHERE id = locked_job.id;

    RETURN QUERY SELECT 'failed'::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  next_retry_at := now() + CASE
    WHEN locked_job.attempts = 1 THEN interval '1 minute'
    ELSE interval '5 minutes'
  END;

  UPDATE public.workflow_jobs
  SET status = 'queued',
      lease_until = NULL,
      lease_token = NULL,
      retry_at = next_retry_at,
      error = LEFT(COALESCE(NULLIF(btrim(p_error), ''), 'Workflow failed; retry scheduled.'), 4000),
      updated_at = now()
  WHERE id = locked_job.id;

  RETURN QUERY SELECT 'retry_queued'::TEXT, next_retry_at;
END;
$$;

COMMENT ON FUNCTION public.resolve_workflow_failure(UUID, UUID, TEXT)
  IS 'Fenced worker failure resolution with bounded retry backoff and terminal exhaustion.';

REVOKE ALL ON FUNCTION public.claim_workflow_jobs(INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resolve_workflow_failure(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_workflow_jobs(INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_workflow_failure(UUID, UUID, TEXT) TO service_role;
