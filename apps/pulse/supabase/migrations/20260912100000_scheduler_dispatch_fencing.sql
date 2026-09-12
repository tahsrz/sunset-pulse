CREATE OR REPLACE FUNCTION public.advance_workflow_schedule(p_schedule_id UUID, p_expected_at TIMESTAMPTZ, p_expected_revision INTEGER, p_next_at TIMESTAMPTZ)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE changed BOOLEAN;
BEGIN
  UPDATE public.workflow_schedules SET next_run_at = p_next_at, revision = revision + 1, updated_at = now()
  WHERE id = p_schedule_id AND enabled = true AND next_run_at = p_expected_at AND revision = p_expected_revision
  RETURNING true INTO changed;
  RETURN COALESCE(changed, false);
END; $$;
