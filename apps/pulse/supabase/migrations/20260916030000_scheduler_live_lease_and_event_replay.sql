-- Forward repair: a live token also needs an unexpired lease, even before recovery.
-- clock_timestamp() checks wall time after a row-lock wait, not transaction start.
-- Package A7: fence worker terminal transitions and persist results atomically.
-- Cancelling a running job invalidates its lease token. This prevents a stale
-- worker from changing the job after cancellation, but cannot retract an
-- external action that was already accepted by a provider.

CREATE OR REPLACE FUNCTION public.complete_workflow_job_with_result(
  p_job_id UUID,
  p_lease_token UUID,
  p_result_type TEXT,
  p_result_id UUID,
  p_run_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  locked_job public.workflow_jobs%ROWTYPE;
BEGIN
  IF p_job_id IS NULL
    OR p_lease_token IS NULL
    OR p_result_id IS NULL
    OR p_result_type IS NULL
    OR char_length(btrim(p_result_type)) = 0
    OR char_length(p_result_type) > 120 THEN
    RETURN false;
  END IF;

  SELECT *
  INTO locked_job
  FROM public.workflow_jobs
  WHERE id = p_job_id
  FOR UPDATE;

  IF NOT FOUND
    OR locked_job.status <> 'running'
    OR locked_job.lease_token IS DISTINCT FROM p_lease_token
    OR locked_job.lease_until IS NULL
    OR locked_job.lease_until <= clock_timestamp() THEN
    RETURN false;
  END IF;

  INSERT INTO public.workflow_results (
    job_id,
    workflow_key,
    result_type,
    result_id
  )
  VALUES (
    locked_job.id,
    locked_job.workflow_key,
    btrim(p_result_type),
    p_result_id
  )
  ON CONFLICT (job_id) DO UPDATE
  SET workflow_key = EXCLUDED.workflow_key,
      result_type = EXCLUDED.result_type,
      result_id = EXCLUDED.result_id;

  UPDATE public.workflow_jobs
  SET status = 'completed',
      run_id = p_run_id,
      result_id = p_result_id,
      lease_until = NULL,
      lease_token = NULL,
      retry_at = NULL,
      error = NULL,
      updated_at = now()
  WHERE id = locked_job.id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_workflow_job(
  p_job_id UUID,
  p_lease_token UUID,
  p_error TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_job_id IS NULL OR p_lease_token IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.workflow_jobs
  SET status = 'failed',
      lease_until = NULL,
      lease_token = NULL,
      retry_at = NULL,
      error = LEFT(COALESCE(NULLIF(btrim(p_error), ''), 'Workflow failed.'), 4000),
      updated_at = now()
  WHERE id = p_job_id
    AND status = 'running'
    AND lease_token IS NOT DISTINCT FROM p_lease_token
    AND lease_until > clock_timestamp();

  RETURN FOUND;
END;
$$;

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
      updated_at = now()
  WHERE id = p_job_id
    AND user_id = p_user_id
    AND status IN ('queued', 'running');

  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION public.cancel_workflow_job(UUID, UUID)
  IS 'Fences queued/running work. Cancellation cannot undo an external action already accepted by a provider.';

REVOKE ALL ON FUNCTION public.complete_workflow_job_with_result(UUID, UUID, TEXT, UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_workflow_job(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cancel_workflow_job(UUID, UUID) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.complete_workflow_job_with_result(UUID, UUID, TEXT, UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_workflow_job(UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_workflow_job(UUID, UUID) TO service_role;


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
    OR locked_job.lease_token IS DISTINCT FROM p_lease_token
    OR locked_job.lease_until IS NULL
    OR locked_job.lease_until <= clock_timestamp() THEN
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


-- An omitted event time means immediate on first insert, unchanged on replay.
CREATE OR REPLACE FUNCTION public.enqueue_workflow_event(
  p_user_id UUID,
  p_workflow_key TEXT,
  p_event_key TEXT,
  p_payload JSONB,
  p_payload_version INTEGER DEFAULT 1,
  p_scheduled_for TIMESTAMPTZ DEFAULT NULL
)
RETURNS SETOF public.workflow_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  contract_row public.workflow_event_contracts%ROWTYPE;
  existing_job public.workflow_jobs%ROWTYPE;
  inserted_job public.workflow_jobs%ROWTYPE;
BEGIN
  IF p_user_id IS NULL
    OR p_workflow_key IS NULL
    OR char_length(btrim(p_workflow_key)) = 0
    OR char_length(p_workflow_key) > 120
    OR p_event_key IS NULL
    OR char_length(btrim(p_event_key)) = 0
    OR char_length(p_event_key) > 240
    OR p_payload IS NULL
    OR jsonb_typeof(p_payload) <> 'object'
    OR p_payload_version IS NULL THEN
    RAISE EXCEPTION 'Invalid workflow event request';
  END IF;

  SELECT * INTO contract_row
  FROM public.workflow_event_contracts
  WHERE workflow_key = btrim(p_workflow_key) AND enabled = true;

  IF NOT FOUND
    OR p_payload_version < contract_row.min_payload_version
    OR p_payload_version > contract_row.max_payload_version THEN
    RAISE EXCEPTION 'Unsupported workflow event contract';
  END IF;

  SELECT * INTO existing_job
  FROM public.workflow_jobs
  WHERE user_id = p_user_id
    AND workflow_key = btrim(p_workflow_key)
    AND trigger_kind = 'event'
    AND event_key = btrim(p_event_key)
  FOR UPDATE;

  IF FOUND THEN
    IF existing_job.payload_version <> p_payload_version
      OR existing_job.payload IS DISTINCT FROM p_payload
      OR (p_scheduled_for IS NOT NULL AND existing_job.scheduled_for <> p_scheduled_for) THEN
      RAISE EXCEPTION 'Workflow event key already exists with a different payload';
    END IF;
    RETURN NEXT existing_job;
    RETURN;
  END IF;

  INSERT INTO public.workflow_jobs (
    schedule_id, user_id, workflow_key, trigger_kind, event_key,
    payload, payload_version, scheduled_for, status
  )
  VALUES (
    NULL, p_user_id, btrim(p_workflow_key), 'event', btrim(p_event_key),
    p_payload, p_payload_version, COALESCE(p_scheduled_for, clock_timestamp()), 'queued'
  )
  ON CONFLICT (user_id, workflow_key, event_key)
    WHERE trigger_kind = 'event' AND event_key IS NOT NULL
  DO NOTHING
  RETURNING * INTO inserted_job;

  IF NOT FOUND THEN
    SELECT * INTO existing_job
    FROM public.workflow_jobs
    WHERE user_id = p_user_id
      AND workflow_key = btrim(p_workflow_key)
      AND trigger_kind = 'event'
      AND event_key = btrim(p_event_key)
    FOR UPDATE;
    IF NOT FOUND
      OR existing_job.payload_version <> p_payload_version
      OR existing_job.payload IS DISTINCT FROM p_payload
      OR (p_scheduled_for IS NOT NULL AND existing_job.scheduled_for <> p_scheduled_for) THEN
      RAISE EXCEPTION 'Workflow event key already exists with a different payload';
    END IF;
    RETURN NEXT existing_job;
    RETURN;
  END IF;

  RETURN NEXT inserted_job;
END;
$$;


REVOKE ALL ON FUNCTION public.enqueue_workflow_event(UUID, TEXT, TEXT, JSONB, INTEGER, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_workflow_event(UUID, TEXT, TEXT, JSONB, INTEGER, TIMESTAMPTZ) TO service_role;
