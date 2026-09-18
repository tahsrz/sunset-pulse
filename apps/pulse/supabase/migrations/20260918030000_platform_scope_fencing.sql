-- Active-workspace fencing and immutable scope ownership for compatibility RPCs.
-- Existing mappings cannot be transferred implicitly by schedule/backlog upserts.
CREATE FUNCTION public.platform_guard_scope_link()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = 'mapped' AND
    (NEW.workspace_id IS DISTINCT FROM OLD.workspace_id OR NEW.owner_id IS DISTINCT FROM OLD.owner_id
      OR NEW.resource_type IS DISTINCT FROM OLD.resource_type OR NEW.resource_id IS DISTINCT FROM OLD.resource_id
      OR NEW.status <> 'mapped') THEN
    RAISE EXCEPTION 'Explicit scope transfer is not supported' USING ERRCODE = '40001';
  END IF;
  IF NEW.workspace_id IS NOT NULL THEN
    PERFORM 1 FROM public.platform_workspaces WHERE id=NEW.workspace_id AND status='active' FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Workspace access denied' USING ERRCODE='42501'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.platform_guard_scope_link() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER platform_scope_link_guard BEFORE INSERT OR UPDATE ON public.platform_scope_links
FOR EACH ROW EXECUTE FUNCTION public.platform_guard_scope_link();

-- OP02: atomic workspace-aware property mutations.
-- The legacy owner-scoped services remain available; these RPCs are the
-- compatibility boundary for callers that already have a workspace context.

CREATE OR REPLACE FUNCTION public.platform_save_property_shortlist_entry(
  p_actor_id UUID,
  p_workspace_id UUID,
  p_property_id UUID,
  p_expected_revision INTEGER,
  p_address TEXT,
  p_city TEXT,
  p_state TEXT,
  p_postal_code TEXT,
  p_mls_id TEXT,
  p_county TEXT,
  p_parcel_number TEXT,
  p_property_kind TEXT,
  p_unresolved_questions JSONB
)
RETURNS SETOF public.property_shortlist_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  membership_role TEXT;
  target_owner UUID;
  saved public.property_shortlist_entries%ROWTYPE;
BEGIN
  IF p_actor_id IS NULL OR p_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Property actor and workspace are required' USING ERRCODE = '22023';
  END IF;

  PERFORM public.platform_require_run_role(p_actor_id,p_workspace_id,ARRAY['owner','admin','member']);

  IF p_property_kind NOT IN ('residential', 'land')
    OR p_state IS NULL OR char_length(btrim(p_state)) <> 2
    OR p_unresolved_questions IS NULL OR jsonb_typeof(p_unresolved_questions) <> 'array'
    OR jsonb_array_length(p_unresolved_questions) > 50 THEN
    RAISE EXCEPTION 'Invalid property shortlist values' USING ERRCODE = '22023';
  END IF;

  IF p_property_id IS NULL THEN
    INSERT INTO public.property_shortlist_entries (
      owner_id, area_key, address, city, state, postal_code, mls_id,
      county, parcel_number, property_kind, unresolved_questions, status, revision
    ) VALUES (
      p_actor_id, 'keller-westlake', p_address, p_city, p_state, p_postal_code, p_mls_id,
      p_county, p_parcel_number, p_property_kind, p_unresolved_questions, 'active', 1
    ) RETURNING * INTO saved;

    INSERT INTO public.platform_scope_links (
      resource_type, resource_id, owner_id, workspace_id, status,
      reason, source_revision, revision
    ) VALUES (
      'property_shortlist', saved.id::TEXT, saved.owner_id, p_workspace_id, 'mapped',
      NULL, saved.revision, 1
    );
    RETURN NEXT saved;
    RETURN;
  END IF;

  SELECT scope.owner_id INTO target_owner
  FROM public.platform_scope_links AS scope
  WHERE scope.resource_type = 'property_shortlist'
    AND scope.resource_id = p_property_id::TEXT
    AND scope.workspace_id = p_workspace_id
    AND scope.status = 'mapped'
  FOR UPDATE;
  IF target_owner IS NULL THEN
    RAISE EXCEPTION 'Property is not mapped into this workspace' USING ERRCODE = 'P0002';
  END IF;
  IF p_expected_revision IS NULL THEN
    RAISE EXCEPTION 'Expected property revision is required' USING ERRCODE = '22023';
  END IF;

  UPDATE public.property_shortlist_entries
  SET address = p_address,
      city = p_city,
      state = p_state,
      postal_code = p_postal_code,
      mls_id = p_mls_id,
      county = p_county,
      parcel_number = p_parcel_number,
      property_kind = p_property_kind,
      unresolved_questions = p_unresolved_questions,
      status = 'active',
      revision = revision + 1,
      updated_at = now()
  WHERE id = p_property_id
    AND owner_id = target_owner
    AND revision = p_expected_revision
  RETURNING * INTO saved;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property shortlist revision conflict' USING ERRCODE = '40001';
  END IF;

  UPDATE public.platform_scope_links
  SET source_revision = saved.revision,
      revision = revision + 1,
      updated_at = now()
  WHERE resource_type = 'property_shortlist'
    AND resource_id = saved.id::TEXT
    AND workspace_id = p_workspace_id;

  RETURN NEXT saved;
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_archive_property_shortlist_entry(
  p_actor_id UUID,
  p_workspace_id UUID,
  p_property_id UUID,
  p_expected_revision INTEGER
)
RETURNS SETOF public.property_shortlist_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  membership_role TEXT;
  target_owner UUID;
  archived public.property_shortlist_entries%ROWTYPE;
BEGIN
  PERFORM public.platform_require_run_role(p_actor_id,p_workspace_id,ARRAY['owner','admin','member']);
  IF p_expected_revision IS NULL THEN
    RAISE EXCEPTION 'Expected property revision is required' USING ERRCODE = '22023';
  END IF;

  SELECT scope.owner_id INTO target_owner
  FROM public.platform_scope_links AS scope
  WHERE scope.resource_type = 'property_shortlist'
    AND scope.resource_id = p_property_id::TEXT
    AND scope.workspace_id = p_workspace_id
    AND scope.status = 'mapped'
  FOR UPDATE;
  IF target_owner IS NULL THEN
    RAISE EXCEPTION 'Property is not mapped into this workspace' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.property_shortlist_entries
  SET status = 'archived', revision = revision + 1, updated_at = now()
  WHERE id = p_property_id
    AND owner_id = target_owner
    AND revision = p_expected_revision
  RETURNING * INTO archived;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property shortlist revision conflict' USING ERRCODE = '40001';
  END IF;

  UPDATE public.platform_scope_links
  SET source_revision = archived.revision,
      revision = revision + 1,
      updated_at = now()
  WHERE resource_type = 'property_shortlist'
    AND resource_id = archived.id::TEXT
    AND workspace_id = p_workspace_id;

  RETURN NEXT archived;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_save_property_shortlist_entry(UUID, UUID, UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.platform_save_property_shortlist_entry(UUID, UUID, UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO service_role;
REVOKE ALL ON FUNCTION public.platform_archive_property_shortlist_entry(UUID, UUID, UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.platform_archive_property_shortlist_entry(UUID, UUID, UUID, INTEGER) TO service_role;



CREATE OR REPLACE FUNCTION public.platform_approve_sprint_with_assignments(
  p_actor_id UUID, p_workspace_id UUID, p_sprint_id UUID,
  p_expected_revision INTEGER DEFAULT NULL
)
RETURNS TABLE (sprint_id UUID, sprint_status TEXT, assignment_count INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  membership_role TEXT;
  mapped_owner UUID;
  locked_sprint public.sprints%ROWTYPE;
BEGIN
  PERFORM public.platform_require_run_role(p_actor_id,p_workspace_id,ARRAY['owner','admin','member']);

  SELECT scope.owner_id INTO mapped_owner FROM public.platform_scope_links AS scope
  WHERE scope.resource_type = 'sprint' AND scope.resource_id = p_sprint_id::TEXT
    AND scope.workspace_id = p_workspace_id AND scope.status = 'mapped' FOR UPDATE;
  IF mapped_owner IS NULL THEN RAISE EXCEPTION 'Sprint is not mapped into this workspace' USING ERRCODE = 'P0002'; END IF;

  SELECT * INTO locked_sprint FROM public.sprints
  WHERE id = p_sprint_id AND owner_id = mapped_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sprint not found'; END IF;
  IF locked_sprint.status = 'approved' THEN
    RETURN QUERY SELECT p_sprint_id, 'approved'::TEXT,
      (SELECT count(*)::INTEGER FROM public.agent_assignments AS assignment
       JOIN public.sprint_items AS item ON item.id = assignment.sprint_item_id
       WHERE item.sprint_id = p_sprint_id);
    RETURN;
  END IF;
  IF locked_sprint.status <> 'proposed' THEN RAISE EXCEPTION 'Sprint cannot be approved from current status'; END IF;
  IF p_expected_revision IS NULL OR locked_sprint.revision <> p_expected_revision THEN RAISE EXCEPTION 'Sprint revision conflict'; END IF;

  UPDATE public.sprints SET status = 'approved', approved_at = now(), approved_by = p_actor_id,
    revision = revision + 1, updated_at = now() WHERE id = p_sprint_id;

  INSERT INTO public.agent_assignments (
    owner_id, sprint_item_id, property_id, property_revision, worker_id, instructions, status
  )
  SELECT mapped_owner, item.id, item.property_id, item.property_revision, item.worker_id,
    item.title, CASE WHEN item.worker_id IS NULL THEN 'unassigned' ELSE 'assigned' END
  FROM public.sprint_items AS item
  WHERE item.sprint_id = p_sprint_id AND item.owner_id = mapped_owner AND item.status <> 'cancelled'
  ON CONFLICT (sprint_item_id) DO NOTHING;

  INSERT INTO public.platform_scope_links (
    resource_type, resource_id, owner_id, workspace_id, status, source_revision, revision
  )
  SELECT 'assignment', assignment.id::TEXT, mapped_owner, p_workspace_id, 'mapped',
    locked_sprint.revision + 1, 1
  FROM public.agent_assignments AS assignment
  JOIN public.sprint_items AS item ON item.id = assignment.sprint_item_id
  WHERE item.sprint_id = p_sprint_id
  ON CONFLICT (resource_type, resource_id) DO UPDATE
  SET workspace_id = EXCLUDED.workspace_id, owner_id = EXCLUDED.owner_id,
    status = 'mapped', source_revision = EXCLUDED.source_revision,
    revision = public.platform_scope_links.revision + 1, updated_at = now();

  UPDATE public.platform_scope_links SET source_revision = locked_sprint.revision + 1,
    revision = revision + 1, updated_at = now()
  WHERE resource_type = 'sprint' AND resource_id = p_sprint_id::TEXT AND workspace_id = p_workspace_id;

  RETURN QUERY SELECT p_sprint_id, 'approved'::TEXT,
    (SELECT count(*)::INTEGER FROM public.agent_assignments AS assignment
     JOIN public.sprint_items AS item ON item.id = assignment.sprint_item_id
     WHERE item.sprint_id = p_sprint_id);
END;
$$;



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
  PERFORM public.platform_require_run_role(p_actor_id,p_workspace_id,ARRAY['owner','admin','member']);

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
  PERFORM public.platform_require_run_role(p_actor_id,p_workspace_id,ARRAY['owner','admin','member']);
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
  PERFORM public.platform_require_run_role(p_actor_id,p_workspace_id,ARRAY['owner','admin','member']);
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
  PERFORM public.platform_require_run_role(p_actor_id,p_workspace_id,ARRAY['owner','admin','member']);
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
