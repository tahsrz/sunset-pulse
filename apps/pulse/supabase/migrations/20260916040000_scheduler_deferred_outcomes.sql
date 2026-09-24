-- Package S6: let a worker durably defer a live job for a bounded poll.
-- Deferred polls do not consume the execution retry budget. They remain
-- schedule-gated, cancellable, and fenced by the original live lease.

ALTER TABLE public.workflow_jobs
  ADD COLUMN IF NOT EXISTS poll_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS poll_deadline TIMESTAMPTZ;

DO $$
DECLARE
  existing_constraint RECORD;
BEGIN
  FOR existing_constraint IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.workflow_jobs'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%queued%'
      AND pg_get_constraintdef(oid) LIKE '%cancelled%'
  LOOP
    EXECUTE format('ALTER TABLE public.workflow_jobs DROP CONSTRAINT %I', existing_constraint.conname);
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.workflow_jobs'::regclass
      AND conname = 'workflow_jobs_status_check'
  ) THEN
    ALTER TABLE public.workflow_jobs
      ADD CONSTRAINT workflow_jobs_status_check
      CHECK (status IN ('queued', 'deferred', 'running', 'completed', 'failed', 'cancelled'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.workflow_jobs'::regclass
      AND conname = 'workflow_jobs_poll_attempts_check'
  ) THEN
    ALTER TABLE public.workflow_jobs
      ADD CONSTRAINT workflow_jobs_poll_attempts_check
      CHECK (poll_attempts >= 0);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS workflow_jobs_poll_idx
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
    SELECT job.id
    FROM public.workflow_jobs AS job
    LEFT JOIN public.workflow_schedules AS schedule
      ON schedule.id = job.schedule_id
     AND schedule.user_id = job.user_id
     AND schedule.workflow_key = job.workflow_key
    WHERE job.status IN ('queued', 'deferred')
      AND job.scheduled_for <= clock_timestamp()
      AND (job.retry_at IS NULL OR job.retry_at <= clock_timestamp())
      AND job.attempts < 3
      AND (
        (job.trigger_kind = 'scheduled' AND schedule.id IS NOT NULL AND schedule.enabled = true)
        OR
        (job.trigger_kind = 'event' AND job.schedule_id IS NULL)
      )
    ORDER BY job.scheduled_for, job.id
    FOR UPDATE OF job SKIP LOCKED
    LIMIT p_limit
  )
  UPDATE public.workflow_jobs AS job
  SET status = 'running',
      attempts = job.attempts + CASE WHEN job.status = 'queued' THEN 1 ELSE 0 END,
      lease_until = clock_timestamp() + make_interval(secs => p_lease_seconds),
      lease_token = gen_random_uuid(),
      retry_at = NULL,
      poll_deadline = COALESCE(job.poll_deadline, clock_timestamp() + interval '24 hours'),
      updated_at = clock_timestamp()
  FROM candidates
  WHERE job.id = candidates.id
  RETURNING job.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.defer_workflow_job(
  p_job_id UUID,
  p_lease_token UUID,
  p_next_poll_at TIMESTAMPTZ,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE(status TEXT, next_poll_at TIMESTAMPTZ, poll_attempts INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  locked_job public.workflow_jobs%ROWTYPE;
  deadline TIMESTAMPTZ;
  reason TEXT;
BEGIN
  IF p_job_id IS NULL OR p_lease_token IS NULL OR p_next_poll_at IS NULL THEN
    RETURN QUERY SELECT 'stale'::TEXT, NULL::TIMESTAMPTZ, NULL::INTEGER;
    RETURN;
  END IF;

  SELECT * INTO locked_job
  FROM public.workflow_jobs
  WHERE id = p_job_id
  FOR UPDATE;

  IF NOT FOUND
    OR locked_job.status <> 'running'
    OR locked_job.lease_token IS DISTINCT FROM p_lease_token
    OR locked_job.lease_until IS NULL
    OR locked_job.lease_until <= clock_timestamp() THEN
    RETURN QUERY SELECT 'stale'::TEXT, NULL::TIMESTAMPTZ, NULL::INTEGER;
    RETURN;
  END IF;

  deadline := COALESCE(locked_job.poll_deadline, clock_timestamp() + interval '24 hours');
  reason := LEFT(COALESCE(NULLIF(btrim(p_reason), ''), 'Workflow deferred for a later poll.'), 4000);

  IF p_next_poll_at <= clock_timestamp() OR locked_job.poll_attempts >= 20 OR p_next_poll_at > deadline THEN
    UPDATE public.workflow_jobs
    SET status = 'failed',
        lease_until = NULL,
        lease_token = NULL,
        retry_at = NULL,
        poll_deadline = deadline,
        error = CASE
          WHEN p_next_poll_at <= clock_timestamp() THEN 'Workflow returned an invalid poll time.'
          ELSE 'Workflow deferred polling budget exceeded.'
        END,
        updated_at = clock_timestamp()
    WHERE id = locked_job.id;

    RETURN QUERY SELECT 'poll_exhausted'::TEXT, NULL::TIMESTAMPTZ, locked_job.poll_attempts;
    RETURN;
  END IF;

  UPDATE public.workflow_jobs
  SET status = 'deferred',
      lease_until = NULL,
      lease_token = NULL,
      retry_at = p_next_poll_at,
      poll_deadline = deadline,
      poll_attempts = locked_job.poll_attempts + 1,
      error = reason,
      updated_at = clock_timestamp()
  WHERE id = locked_job.id;

  RETURN QUERY SELECT 'deferred'::TEXT, p_next_poll_at, locked_job.poll_attempts + 1;
END;
$$;

COMMENT ON FUNCTION public.defer_workflow_job(UUID, UUID, TIMESTAMPTZ, TEXT)
  IS 'Fenced live worker deferral. Polls have a 20-attempt and 24-hour budget and do not consume execution attempts.';

CREATE OR REPLACE FUNCTION public.cancel_workflow_job(
  p_job_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_job_id IS NULL OR p_user_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.workflow_jobs
  SET status = 'cancelled',
      lease_until = NULL,
      lease_token = NULL,
      retry_at = NULL,
      error = 'Cancelled by the owner. A provider action already accepted cannot be retracted.',
      updated_at = clock_timestamp()
  WHERE id = p_job_id
    AND user_id = p_user_id
    AND status IN ('queued', 'deferred', 'running');

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_workflow_jobs(INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.defer_workflow_job(UUID, UUID, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cancel_workflow_job(UUID, UUID) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_workflow_jobs(INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.defer_workflow_job(UUID, UUID, TIMESTAMPTZ, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_workflow_job(UUID, UUID) TO service_role;
