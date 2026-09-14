-- Package A6: atomically dispatch one due schedule occurrence.
-- The caller computes the next future local-calendar occurrence; this RPC
-- serializes the due check, unique job insert, and schedule advancement.

CREATE OR REPLACE FUNCTION public.dispatch_due_workflow_schedule(
  p_schedule_id UUID,
  p_expected_at TIMESTAMPTZ,
  p_expected_revision INTEGER,
  p_next_at TIMESTAMPTZ,
  p_now TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
  inserted_count INTEGER,
  job_id UUID,
  scheduled_for TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  schedule_revision INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  locked_schedule public.workflow_schedules%ROWTYPE;
  inserted_job_id UUID;
  occurrence TIMESTAMPTZ;
  did_insert INTEGER := 0;
BEGIN
  IF p_schedule_id IS NULL
    OR p_expected_at IS NULL
    OR p_expected_revision IS NULL
    OR p_next_at IS NULL
    OR p_now IS NULL THEN
    RAISE EXCEPTION 'Scheduler dispatch requires a complete schedule cursor.';
  END IF;

  IF p_next_at <= p_now OR p_next_at <= p_expected_at THEN
    RAISE EXCEPTION 'Scheduler next occurrence must be after the dispatch clock and current occurrence.';
  END IF;

  SELECT *
  INTO locked_schedule
  FROM public.workflow_schedules
  WHERE id = p_schedule_id
  FOR UPDATE;

  IF NOT FOUND
    OR locked_schedule.enabled = false
    OR locked_schedule.next_run_at <> p_expected_at
    OR locked_schedule.revision <> p_expected_revision
    OR locked_schedule.next_run_at > p_now THEN
    RETURN;
  END IF;

  occurrence := locked_schedule.next_run_at;

  INSERT INTO public.workflow_jobs (
    schedule_id,
    user_id,
    workflow_key,
    planning_mode,
    scheduled_for,
    status
  )
  VALUES (
    locked_schedule.id,
    locked_schedule.user_id,
    locked_schedule.workflow_key,
    COALESCE(locked_schedule.planning_mode, 'manual_backlog'),
    occurrence,
    'queued'
  )
  ON CONFLICT (schedule_id, scheduled_for) DO NOTHING
  RETURNING id INTO inserted_job_id;

  GET DIAGNOSTICS did_insert = ROW_COUNT;

  IF inserted_job_id IS NULL THEN
    SELECT id
    INTO inserted_job_id
    FROM public.workflow_jobs
    WHERE schedule_id = locked_schedule.id
      AND scheduled_for = occurrence;
  END IF;

  UPDATE public.workflow_schedules
  SET next_run_at = p_next_at,
      revision = locked_schedule.revision + 1,
      updated_at = now()
  WHERE id = locked_schedule.id;

  RETURN QUERY
  SELECT did_insert,
         inserted_job_id,
         occurrence,
         p_next_at,
         locked_schedule.revision + 1;
END;
$$;

REVOKE ALL ON FUNCTION public.dispatch_due_workflow_schedule(UUID, TIMESTAMPTZ, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_due_workflow_schedule(UUID, TIMESTAMPTZ, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;
