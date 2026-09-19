-- OP02: bridge scheduler-created sprints into the explicit workspace boundary.

CREATE OR REPLACE FUNCTION public.platform_persist_property_sprint_proposal(
  p_job_id UUID, p_owner_id UUID, p_lease_token UUID, p_occurrence TIMESTAMPTZ,
  p_name TEXT, p_goal TEXT, p_backlog_items JSONB DEFAULT '[]'::jsonb,
  p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS TABLE (sprint_id UUID, item_count INTEGER, reused BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  persisted RECORD;
  personal_workspace UUID;
BEGIN
  SELECT workspace.id INTO personal_workspace
  FROM public.platform_workspaces AS workspace
  JOIN public.platform_memberships AS membership ON membership.workspace_id = workspace.id
  WHERE workspace.created_by = p_owner_id AND workspace.kind = 'personal'
    AND workspace.status = 'active' AND membership.user_id = p_owner_id
    AND membership.status = 'active' AND membership.role = 'owner'
  ORDER BY workspace.created_at LIMIT 1;

  SELECT * INTO persisted FROM public.persist_property_sprint_proposal(
    p_job_id, p_owner_id, p_lease_token, p_occurrence, p_name, p_goal,
    p_backlog_items, p_items
  );

  IF personal_workspace IS NOT NULL THEN
    INSERT INTO public.platform_scope_links (
      resource_type, resource_id, owner_id, workspace_id, status,
      reason, source_revision, revision
    )
    SELECT 'sprint', persisted.sprint_id::TEXT, p_owner_id, personal_workspace,
      'mapped', NULL, sprint.revision, 1
    FROM public.sprints AS sprint WHERE sprint.id = persisted.sprint_id
    ON CONFLICT (resource_type, resource_id) DO UPDATE
    SET workspace_id = EXCLUDED.workspace_id, owner_id = EXCLUDED.owner_id,
        status = 'mapped', reason = NULL, source_revision = EXCLUDED.source_revision,
        revision = public.platform_scope_links.revision + 1, updated_at = now();
  END IF;

  RETURN QUERY SELECT persisted.sprint_id, persisted.item_count, persisted.reused;
END;
$$;

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
  SELECT membership.role INTO membership_role
  FROM public.platform_memberships AS membership
  WHERE membership.workspace_id = p_workspace_id AND membership.user_id = p_actor_id
    AND membership.status = 'active' AND membership.role IN ('owner', 'admin', 'member');
  IF membership_role IS NULL THEN RAISE EXCEPTION 'Sprint approval access denied' USING ERRCODE = '42501'; END IF;

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

REVOKE ALL ON FUNCTION public.platform_persist_property_sprint_proposal(UUID, UUID, UUID, TIMESTAMPTZ, TEXT, TEXT, JSONB, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.platform_persist_property_sprint_proposal(UUID, UUID, UUID, TIMESTAMPTZ, TEXT, TEXT, JSONB, JSONB) TO service_role;
REVOKE ALL ON FUNCTION public.platform_approve_sprint_with_assignments(UUID, UUID, UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.platform_approve_sprint_with_assignments(UUID, UUID, UUID, INTEGER) TO service_role;
