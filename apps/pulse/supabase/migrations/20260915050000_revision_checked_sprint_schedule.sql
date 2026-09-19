-- Package B: schedule edits are owner-scoped and revision checked.
-- Updating a schedule must not implicitly re-enable a paused schedule.
CREATE OR REPLACE FUNCTION public.save_sprint_planner_schedule(
  p_owner_id UUID,
  p_expected_revision INTEGER,
  p_planning_mode TEXT,
  p_cadence TEXT,
  p_time_zone TEXT,
  p_local_hour INTEGER,
  p_local_minute INTEGER,
  p_local_weekday INTEGER,
  p_next_run_at TIMESTAMPTZ
)
RETURNS SETOF public.workflow_schedules
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  saved_schedule public.workflow_schedules%ROWTYPE;
BEGIN
  IF p_owner_id IS NULL THEN
    RAISE EXCEPTION 'Schedule owner is required';
  END IF;
  IF p_expected_revision IS NOT NULL AND p_expected_revision < 1 THEN
    RAISE EXCEPTION 'Schedule revision must be positive';
  END IF;
  IF p_planning_mode NOT IN ('manual_backlog', 'property_shortlist') THEN
    RAISE EXCEPTION 'Invalid sprint planning mode';
  END IF;
  IF p_cadence NOT IN ('daily', 'weekly') THEN
    RAISE EXCEPTION 'Invalid sprint cadence';
  END IF;
  IF p_local_hour IS NULL OR p_local_hour NOT BETWEEN 0 AND 23 THEN
    RAISE EXCEPTION 'Invalid local hour';
  END IF;
  IF p_local_minute IS NULL OR p_local_minute NOT BETWEEN 0 AND 59 THEN
    RAISE EXCEPTION 'Invalid local minute';
  END IF;
  IF p_local_weekday IS NULL OR p_local_weekday NOT BETWEEN 1 AND 7 THEN
    RAISE EXCEPTION 'Invalid local weekday';
  END IF;
  IF p_next_run_at IS NULL THEN
    RAISE EXCEPTION 'Next run time is required';
  END IF;

  SELECT * INTO saved_schedule
  FROM public.workflow_schedules
  WHERE user_id = p_owner_id AND workflow_key = 'sprint_planner'
  FOR UPDATE;

  IF FOUND THEN
    IF p_expected_revision IS NULL OR saved_schedule.revision <> p_expected_revision THEN
      RAISE EXCEPTION 'Schedule revision conflict';
    END IF;

    UPDATE public.workflow_schedules
    SET planning_mode = p_planning_mode,
        cadence = p_cadence,
        time_zone = p_time_zone,
        local_hour = p_local_hour,
        local_minute = p_local_minute,
        local_weekday = p_local_weekday,
        next_run_at = p_next_run_at,
        revision = saved_schedule.revision + 1,
        updated_at = now()
    WHERE id = saved_schedule.id
    RETURNING * INTO saved_schedule;
  ELSE
    INSERT INTO public.workflow_schedules (
      user_id, workflow_key, planning_mode, cadence, time_zone,
      local_hour, local_minute, local_weekday, enabled, next_run_at
    ) VALUES (
      p_owner_id, 'sprint_planner', p_planning_mode, p_cadence, p_time_zone,
      p_local_hour, p_local_minute, p_local_weekday, true, p_next_run_at
    )
    ON CONFLICT (user_id, workflow_key) DO NOTHING
    RETURNING * INTO saved_schedule;

    -- A concurrent creator won the unique key. Do not overwrite its settings
    -- when this request was intended to create a new schedule.
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Schedule revision conflict';
    END IF;
  END IF;

  RETURN NEXT saved_schedule;
END;
$$;

REVOKE ALL ON FUNCTION public.save_sprint_planner_schedule(UUID, INTEGER, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_sprint_planner_schedule(UUID, INTEGER, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TIMESTAMPTZ) TO service_role;
