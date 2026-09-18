-- OP02 continuation: schedules and independent sprint backlog items use the
-- same explicit workspace links as properties, sprints and assignments.

ALTER TABLE public.platform_scope_links
  DROP CONSTRAINT IF EXISTS platform_scope_links_resource_type_check;
ALTER TABLE public.platform_scope_links
  ADD CONSTRAINT platform_scope_links_resource_type_check CHECK (resource_type IN (
    'profile', 'site_config', 'property_shortlist', 'sprint', 'assignment',
    'licensed_workflow_run', 'vibe_revision', 'scan', 'workflow_schedule',
    'sprint_backlog_item'
  ));

ALTER TABLE public.sprint_backlog_items
  ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION public.platform_save_sprint_planner_schedule(
  p_actor_id UUID,
  p_workspace_id UUID,
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
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  membership_role TEXT;
  saved_schedule public.workflow_schedules%ROWTYPE;
BEGIN
  SELECT membership.role INTO membership_role
  FROM public.platform_memberships AS membership
  WHERE membership.workspace_id = p_workspace_id AND membership.user_id = p_actor_id
    AND membership.status = 'active' AND membership.role IN ('owner', 'admin', 'member');
  IF membership_role IS NULL THEN RAISE EXCEPTION 'Schedule edit access denied' USING ERRCODE = '42501'; END IF;

  SELECT * INTO saved_schedule FROM public.save_sprint_planner_schedule(
    p_actor_id, p_expected_revision, p_planning_mode, p_cadence, p_time_zone,
    p_local_hour, p_local_minute, p_local_weekday, p_next_run_at
  );
  IF NOT FOUND THEN RAISE EXCEPTION 'Schedule was not saved'; END IF;

  INSERT INTO public.platform_scope_links (
    resource_type, resource_id, owner_id, workspace_id, status, source_revision, revision
  ) VALUES (
    'workflow_schedule', saved_schedule.id::TEXT, p_actor_id, p_workspace_id,
    'mapped', saved_schedule.revision, 1
  )
  ON CONFLICT (resource_type, resource_id) DO UPDATE
  SET workspace_id = EXCLUDED.workspace_id, owner_id = EXCLUDED.owner_id,
    status = 'mapped', reason = NULL, source_revision = EXCLUDED.source_revision,
    revision = public.platform_scope_links.revision + 1, updated_at = now();

  RETURN NEXT saved_schedule;
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_add_sprint_backlog_item(
  p_actor_id UUID,
  p_workspace_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_priority INTEGER,
  p_estimate_minutes INTEGER,
  p_source_type TEXT,
  p_source_id TEXT
)
RETURNS SETOF public.sprint_backlog_items
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  membership_role TEXT;
  saved public.sprint_backlog_items%ROWTYPE;
  linked_workspace UUID;
BEGIN
  SELECT membership.role INTO membership_role FROM public.platform_memberships AS membership
  WHERE membership.workspace_id = p_workspace_id AND membership.user_id = p_actor_id
    AND membership.status = 'active' AND membership.role IN ('owner', 'admin', 'member');
  IF membership_role IS NULL THEN RAISE EXCEPTION 'Backlog edit access denied' USING ERRCODE = '42501'; END IF;
  IF p_title IS NULL OR char_length(btrim(p_title)) NOT BETWEEN 1 AND 240
    OR p_description IS NULL OR char_length(p_description) > 2000
    OR p_priority IS NULL OR p_priority NOT BETWEEN 1 AND 5
    OR (p_estimate_minutes IS NOT NULL AND p_estimate_minutes NOT BETWEEN 1 AND 10080)
    OR p_source_type NOT IN ('manual', 'pulse_command', 'property_shortlist', 'github', 'crm') THEN
    RAISE EXCEPTION 'Invalid sprint backlog item' USING ERRCODE = '22023';
  END IF;

  IF p_source_id IS NOT NULL THEN
    SELECT * INTO saved FROM public.sprint_backlog_items
    WHERE owner_id = p_actor_id AND source_type = p_source_type AND source_id = p_source_id
    FOR UPDATE;
  END IF;

  IF saved.id IS NULL THEN
    INSERT INTO public.sprint_backlog_items (
      owner_id, title, description, priority, estimate_minutes, source_type, source_id
    ) VALUES (
      p_actor_id, btrim(p_title), p_description, p_priority, p_estimate_minutes,
      p_source_type, p_source_id
    )
    ON CONFLICT (owner_id, source_type, source_id)
      WHERE source_id IS NOT NULL DO NOTHING
    RETURNING * INTO saved;
    IF saved.id IS NULL AND p_source_id IS NOT NULL THEN
      SELECT * INTO saved FROM public.sprint_backlog_items
      WHERE owner_id = p_actor_id AND source_type = p_source_type AND source_id = p_source_id
      FOR UPDATE;
    END IF;
  END IF;
  IF saved.id IS NULL THEN RAISE EXCEPTION 'Backlog item was not saved'; END IF;

  SELECT workspace_id INTO linked_workspace FROM public.platform_scope_links
  WHERE resource_type = 'sprint_backlog_item' AND resource_id = saved.id::TEXT FOR UPDATE;
  IF linked_workspace IS NOT NULL AND linked_workspace <> p_workspace_id THEN
    RAISE EXCEPTION 'Backlog item is mapped to another workspace' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.platform_scope_links (
    resource_type, resource_id, owner_id, workspace_id, status, source_revision, revision
  ) VALUES (
    'sprint_backlog_item', saved.id::TEXT, saved.owner_id, p_workspace_id,
    'mapped', saved.revision, 1
  )
  ON CONFLICT (resource_type, resource_id) DO UPDATE
  SET workspace_id = EXCLUDED.workspace_id, owner_id = EXCLUDED.owner_id,
    status = 'mapped', reason = NULL, source_revision = EXCLUDED.source_revision,
    revision = public.platform_scope_links.revision + 1, updated_at = now();
  RETURN NEXT saved;
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_update_sprint_backlog_item(
  p_actor_id UUID,
  p_workspace_id UUID,
  p_item_id UUID,
  p_expected_revision INTEGER,
  p_title TEXT,
  p_description TEXT,
  p_priority INTEGER,
  p_estimate_minutes INTEGER,
  p_status TEXT
)
RETURNS SETOF public.sprint_backlog_items
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  membership_role TEXT;
  linked_owner UUID;
  saved public.sprint_backlog_items%ROWTYPE;
BEGIN
  SELECT membership.role INTO membership_role FROM public.platform_memberships AS membership
  WHERE membership.workspace_id = p_workspace_id AND membership.user_id = p_actor_id
    AND membership.status = 'active' AND membership.role IN ('owner', 'admin', 'member');
  IF membership_role IS NULL THEN RAISE EXCEPTION 'Backlog edit access denied' USING ERRCODE = '42501'; END IF;
  SELECT owner_id INTO linked_owner FROM public.platform_scope_links
  WHERE resource_type = 'sprint_backlog_item' AND resource_id = p_item_id::TEXT
    AND workspace_id = p_workspace_id AND status = 'mapped' FOR UPDATE;
  IF linked_owner IS NULL THEN RAISE EXCEPTION 'Backlog item is not mapped into this workspace' USING ERRCODE = 'P0002'; END IF;
  IF p_expected_revision IS NULL THEN RAISE EXCEPTION 'Expected backlog revision is required' USING ERRCODE = '22023'; END IF;

  UPDATE public.sprint_backlog_items SET title = btrim(p_title), description = p_description,
    priority = p_priority, estimate_minutes = p_estimate_minutes, status = p_status,
    revision = revision + 1, updated_at = now()
  WHERE id = p_item_id AND owner_id = linked_owner AND revision = p_expected_revision
  RETURNING * INTO saved;
  IF NOT FOUND THEN RAISE EXCEPTION 'Backlog revision conflict' USING ERRCODE = '40001'; END IF;
  UPDATE public.platform_scope_links SET source_revision = saved.revision,
    revision = revision + 1, updated_at = now()
  WHERE resource_type = 'sprint_backlog_item' AND resource_id = p_item_id::TEXT
    AND workspace_id = p_workspace_id;
  RETURN NEXT saved;
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_remove_sprint_backlog_item(
  p_actor_id UUID, p_workspace_id UUID, p_item_id UUID, p_expected_revision INTEGER
)
RETURNS SETOF public.sprint_backlog_items
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  membership_role TEXT;
  linked_owner UUID;
  saved public.sprint_backlog_items%ROWTYPE;
BEGIN
  SELECT membership.role INTO membership_role FROM public.platform_memberships AS membership
  WHERE membership.workspace_id = p_workspace_id AND membership.user_id = p_actor_id
    AND membership.status = 'active' AND membership.role IN ('owner', 'admin', 'member');
  IF membership_role IS NULL THEN RAISE EXCEPTION 'Backlog edit access denied' USING ERRCODE = '42501'; END IF;
  SELECT owner_id INTO linked_owner FROM public.platform_scope_links
  WHERE resource_type = 'sprint_backlog_item' AND resource_id = p_item_id::TEXT
    AND workspace_id = p_workspace_id AND status = 'mapped' FOR UPDATE;
  IF linked_owner IS NULL THEN RAISE EXCEPTION 'Backlog item is not mapped into this workspace' USING ERRCODE = 'P0002'; END IF;
  IF p_expected_revision IS NULL THEN RAISE EXCEPTION 'Expected backlog revision is required' USING ERRCODE = '22023'; END IF;

  UPDATE public.sprint_backlog_items SET status = 'cancelled', revision = revision + 1, updated_at = now()
  WHERE id = p_item_id AND owner_id = linked_owner AND status = 'open' AND revision = p_expected_revision
  RETURNING * INTO saved;
  IF NOT FOUND THEN RAISE EXCEPTION 'Backlog revision conflict' USING ERRCODE = '40001'; END IF;
  UPDATE public.platform_scope_links SET source_revision = saved.revision,
    revision = revision + 1, updated_at = now()
  WHERE resource_type = 'sprint_backlog_item' AND resource_id = p_item_id::TEXT
    AND workspace_id = p_workspace_id;
  RETURN NEXT saved;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_save_sprint_planner_schedule(UUID, UUID, INTEGER, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.platform_save_sprint_planner_schedule(UUID, UUID, INTEGER, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TIMESTAMPTZ) TO service_role;
REVOKE ALL ON FUNCTION public.platform_add_sprint_backlog_item(UUID, UUID, TEXT, TEXT, INTEGER, INTEGER, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.platform_add_sprint_backlog_item(UUID, UUID, TEXT, TEXT, INTEGER, INTEGER, TEXT, TEXT) TO service_role;
REVOKE ALL ON FUNCTION public.platform_update_sprint_backlog_item(UUID, UUID, UUID, INTEGER, TEXT, TEXT, INTEGER, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.platform_update_sprint_backlog_item(UUID, UUID, UUID, INTEGER, TEXT, TEXT, INTEGER, INTEGER, TEXT) TO service_role;
REVOKE ALL ON FUNCTION public.platform_remove_sprint_backlog_item(UUID, UUID, UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.platform_remove_sprint_backlog_item(UUID, UUID, UUID, INTEGER) TO service_role;
