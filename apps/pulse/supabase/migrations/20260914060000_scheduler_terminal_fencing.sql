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
    OR locked_job.lease_token IS DISTINCT FROM p_lease_token THEN
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
    AND lease_token IS NOT DISTINCT FROM p_lease_token;

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
