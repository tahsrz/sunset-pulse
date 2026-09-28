-- Package A5: forward scheduler hardening after the property workflow migrations.
-- Keep this migration additive and idempotent because earlier scheduler migrations
-- may already be applied in a deployed database.

ALTER TABLE public.workflow_schedules
  ADD COLUMN IF NOT EXISTS local_weekday INTEGER;

UPDATE public.workflow_schedules
SET local_weekday = 1
WHERE local_weekday IS NULL;

ALTER TABLE public.workflow_schedules
  ALTER COLUMN local_weekday SET DEFAULT 1,
  ALTER COLUMN local_weekday SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.workflow_schedules'::regclass
      AND conname = 'workflow_schedules_local_weekday_iso_check'
  ) THEN
    ALTER TABLE public.workflow_schedules
      ADD CONSTRAINT workflow_schedules_local_weekday_iso_check
      CHECK (local_weekday BETWEEN 1 AND 7);
  END IF;
END;
$$;

ALTER TABLE public.workflow_schedules
  ADD COLUMN IF NOT EXISTS revision INTEGER;

UPDATE public.workflow_schedules
SET revision = 1
WHERE revision IS NULL;

ALTER TABLE public.workflow_schedules
  ALTER COLUMN revision SET DEFAULT 1,
  ALTER COLUMN revision SET NOT NULL;

ALTER TABLE public.workflow_jobs
  ADD COLUMN IF NOT EXISTS lease_token UUID,
  ADD COLUMN IF NOT EXISTS retry_at TIMESTAMPTZ;

UPDATE public.workflow_jobs
SET lease_token = gen_random_uuid()
WHERE status = 'running' AND lease_token IS NULL;

CREATE INDEX IF NOT EXISTS workflow_jobs_retry_idx
  ON public.workflow_jobs(status, retry_at, scheduled_for);

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
    SELECT id
    FROM public.workflow_jobs
    WHERE status = 'queued'
      AND scheduled_for <= now()
      AND (retry_at IS NULL OR retry_at <= now())
      AND attempts < 3
    ORDER BY scheduled_for, id
    FOR UPDATE SKIP LOCKED
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

CREATE OR REPLACE FUNCTION public.recover_workflow_leases()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recovered INTEGER;
BEGIN
  UPDATE public.workflow_jobs
  SET status = CASE WHEN attempts >= 3 THEN 'failed' ELSE 'queued' END,
      lease_until = NULL,
      lease_token = NULL,
      retry_at = CASE
        WHEN attempts >= 3 THEN NULL
        WHEN attempts = 1 THEN now() + interval '1 minute'
        ELSE now() + interval '5 minutes'
      END,
      error = CASE
        WHEN attempts >= 3 THEN 'Maximum retry attempts exceeded.'
        ELSE error
      END,
      updated_at = now()
  WHERE status = 'running'
    AND lease_until IS NOT NULL
    AND lease_until < now();

  GET DIAGNOSTICS recovered = ROW_COUNT;
  RETURN recovered;
END;
$$;

-- Result pointers are server-owned records and must not be directly readable or
-- writable by browser roles. Keep the policy explicit in the latest migration.
ALTER TABLE public.workflow_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages workflow results" ON public.workflow_results;
CREATE POLICY "Service role manages workflow results"
  ON public.workflow_results
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON FUNCTION public.claim_workflow_jobs(INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recover_workflow_leases() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.advance_workflow_schedule(UUID, TIMESTAMPTZ, INTEGER, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pause_workflow_schedule(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resume_workflow_schedule(UUID, UUID) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_workflow_jobs(INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.recover_workflow_leases() TO service_role;
GRANT EXECUTE ON FUNCTION public.advance_workflow_schedule(UUID, TIMESTAMPTZ, INTEGER, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.pause_workflow_schedule(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.resume_workflow_schedule(UUID, UUID) TO service_role;
