-- Package C: property planning uses the same lease-checked transaction as
-- manual planning, including deduplicated property backlog rows.
CREATE OR REPLACE FUNCTION public.persist_property_sprint_proposal(
  p_job_id UUID,
  p_owner_id UUID,
  p_lease_token UUID,
  p_occurrence TIMESTAMPTZ,
  p_name TEXT,
  p_goal TEXT,
  p_backlog_items JSONB DEFAULT '[]'::jsonb,
  p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS TABLE (sprint_id UUID, item_count INTEGER, reused BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  locked_job public.workflow_jobs%ROWTYPE;
  existing_sprint public.sprints%ROWTYPE;
  created_sprint_id UUID;
  created_count INTEGER := 0;
BEGIN
  IF p_job_id IS NULL OR p_owner_id IS NULL OR p_lease_token IS NULL OR p_occurrence IS NULL
    OR p_name IS NULL OR char_length(trim(p_name)) NOT BETWEEN 1 AND 160
    OR p_goal IS NULL OR char_length(trim(p_goal)) NOT BETWEEN 1 AND 2000
    OR jsonb_typeof(p_backlog_items) <> 'array' OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Property sprint proposal payload is invalid.';
  END IF;

  SELECT * INTO locked_job FROM public.workflow_jobs
  WHERE id = p_job_id AND user_id = p_owner_id AND workflow_key = 'sprint_planner'
  FOR UPDATE;
  IF NOT FOUND OR locked_job.status <> 'running' OR locked_job.lease_token <> p_lease_token
    OR locked_job.lease_until IS NULL OR locked_job.lease_until <= now()
    OR locked_job.scheduled_for <> p_occurrence THEN
    RAISE EXCEPTION 'Property sprint proposal lease is invalid or expired.';
  END IF;

  SELECT * INTO existing_sprint FROM public.sprints
  WHERE source_job_id = p_job_id AND owner_id = p_owner_id FOR UPDATE;
  IF FOUND THEN
    RETURN QUERY SELECT existing_sprint.id,
      (SELECT count(*)::INTEGER FROM public.sprint_items WHERE sprint_id = existing_sprint.id), true;
    RETURN;
  END IF;

  INSERT INTO public.sprint_backlog_items (
    owner_id, title, description, priority, estimate_minutes, source_type, source_id,
    property_id, property_task_kind, input_revision, dedupe_key
  )
  SELECT p_owner_id, item->>'title', COALESCE(item->>'description', ''),
    COALESCE((item->>'priority')::INTEGER, 3), NULLIF(item->>'estimate_minutes', '')::INTEGER,
    'property_shortlist', item->>'property_id', NULLIF(item->>'property_id', '')::UUID,
    item->>'property_task_kind', NULLIF(item->>'input_revision', '')::INTEGER, item->>'dedupe_key'
  FROM jsonb_array_elements(p_backlog_items) AS item
  ON CONFLICT (owner_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;

  INSERT INTO public.sprints (owner_id, name, goal, status, source_job_id)
  VALUES (p_owner_id, trim(p_name), trim(p_goal), 'proposed', p_job_id)
  RETURNING id INTO created_sprint_id;

  INSERT INTO public.sprint_items (
    sprint_id, owner_id, backlog_item_id, property_id, property_revision,
    title, description, priority, estimate_minutes, status
  )
  SELECT created_sprint_id, p_owner_id, b.id, NULLIF(item->>'property_id', '')::UUID,
    NULLIF(item->>'property_revision', '')::INTEGER, item->>'title',
    COALESCE(item->>'description', ''), COALESCE((item->>'priority')::INTEGER, 3),
    NULLIF(item->>'estimate_minutes', '')::INTEGER, 'proposed'
  FROM jsonb_array_elements(p_items) AS item
  JOIN public.sprint_backlog_items b
    ON b.owner_id = p_owner_id AND b.dedupe_key = item->>'dedupe_key';

  GET DIAGNOSTICS created_count = ROW_COUNT;
  RETURN QUERY SELECT created_sprint_id, created_count, false;
END;
$$;

REVOKE ALL ON FUNCTION public.persist_property_sprint_proposal(UUID, UUID, UUID, TIMESTAMPTZ, TEXT, TEXT, JSONB, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.persist_property_sprint_proposal(UUID, UUID, UUID, TIMESTAMPTZ, TEXT, TEXT, JSONB, JSONB) TO service_role;
