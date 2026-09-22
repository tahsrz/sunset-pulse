-- Forward compatibility fix: qualify the replay count so PL/pgSQL does not
-- confuse the return column sprint_id with sprint_items.sprint_id.
CREATE OR REPLACE FUNCTION public.platform_persist_scoped_sprint_proposal(
  p_job_id UUID, p_workspace_id UUID, p_occurrence TIMESTAMPTZ, p_name TEXT,
  p_goal TEXT, p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS TABLE (sprint_id UUID, item_count INTEGER, reused BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  locked_job public.workflow_jobs%ROWTYPE;
  locked_workspace public.platform_workspaces%ROWTYPE;
  existing_sprint public.sprints%ROWTYPE;
  created_sprint_id UUID;
  created_count INTEGER := 0;
BEGIN
  IF p_job_id IS NULL OR p_workspace_id IS NULL OR p_occurrence IS NULL
    OR p_name IS NULL OR char_length(btrim(p_name)) NOT BETWEEN 1 AND 160
    OR p_goal IS NULL OR char_length(btrim(p_goal)) NOT BETWEEN 1 AND 2000
    OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Scoped sprint proposal payload is invalid' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO locked_job FROM public.workflow_jobs
  WHERE id = p_job_id AND workflow_key = 'sprint_planner' FOR UPDATE;
  IF NOT FOUND OR locked_job.status <> 'running' OR locked_job.lease_token IS NULL
    OR locked_job.lease_until IS NULL OR locked_job.lease_until <= clock_timestamp()
    OR locked_job.scheduled_for <> p_occurrence THEN
    RAISE EXCEPTION 'Scoped sprint proposal lease is invalid or expired' USING ERRCODE = '40001';
  END IF;
  SELECT * INTO locked_workspace FROM public.platform_workspaces
  WHERE id = p_workspace_id AND status = 'active' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Workspace is not active' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.platform_memberships AS membership
    WHERE membership.workspace_id = p_workspace_id AND membership.user_id = locked_job.user_id
      AND membership.status = 'active' AND membership.role IN ('owner','admin','member')) THEN
    RAISE EXCEPTION 'Planner requester is not an active workspace member' USING ERRCODE = '42501';
  END IF;
  IF locked_job.schedule_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.platform_scope_links AS schedule_scope
    WHERE schedule_scope.resource_type = 'workflow_schedule' AND schedule_scope.resource_id = locked_job.schedule_id::TEXT
      AND schedule_scope.workspace_id = p_workspace_id AND schedule_scope.owner_id = locked_job.user_id
      AND schedule_scope.status = 'mapped') THEN
    RAISE EXCEPTION 'Planner schedule is not mapped into this workspace' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_items) AS item
    LEFT JOIN public.sprint_backlog_items AS backlog
      ON backlog.id = NULLIF(item->>'backlog_item_id','')::UUID AND backlog.owner_id = locked_job.user_id
    LEFT JOIN public.platform_scope_links AS backlog_scope
      ON backlog_scope.resource_type = 'sprint_backlog_item' AND backlog_scope.resource_id = backlog.id::TEXT
      AND backlog_scope.workspace_id = p_workspace_id AND backlog_scope.status = 'mapped'
    WHERE backlog.id IS NULL OR backlog_scope.id IS NULL) THEN
    RAISE EXCEPTION 'Every sprint backlog input must be mapped into the workspace' USING ERRCODE = 'P0002';
  END IF;
  SELECT * INTO existing_sprint FROM public.sprints
  WHERE source_job_id = p_job_id AND owner_id = locked_job.user_id FOR UPDATE;
  IF FOUND THEN
    RETURN QUERY SELECT existing_sprint.id,
      (SELECT count(*)::INTEGER FROM public.sprint_items AS si WHERE si.sprint_id = existing_sprint.id), true;
    RETURN;
  END IF;
  INSERT INTO public.sprints (owner_id,name,goal,status,source_job_id)
  VALUES (locked_job.user_id,btrim(p_name),btrim(p_goal),'proposed',p_job_id)
  RETURNING id INTO created_sprint_id;
  INSERT INTO public.sprint_items (sprint_id,owner_id,backlog_item_id,title,description,priority,estimate_minutes,status)
  SELECT created_sprint_id,locked_job.user_id,backlog.id,backlog.title,backlog.description,backlog.priority,backlog.estimate_minutes,'proposed'
  FROM jsonb_array_elements(p_items) AS item
  JOIN public.sprint_backlog_items AS backlog
    ON backlog.id = NULLIF(item->>'backlog_item_id','')::UUID AND backlog.owner_id = locked_job.user_id;
  GET DIAGNOSTICS created_count = ROW_COUNT;
  INSERT INTO public.platform_scope_links (resource_type,resource_id,owner_id,workspace_id,status,source_revision,revision)
  VALUES ('sprint',created_sprint_id::TEXT,locked_job.user_id,p_workspace_id,'mapped',
    (SELECT revision FROM public.sprints WHERE id = created_sprint_id),1)
  ON CONFLICT (resource_type,resource_id) DO UPDATE SET workspace_id=EXCLUDED.workspace_id,
    owner_id=EXCLUDED.owner_id,status='mapped',reason=NULL,source_revision=EXCLUDED.source_revision,
    revision=public.platform_scope_links.revision+1,updated_at=now();
  RETURN QUERY SELECT created_sprint_id,created_count,false;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_persist_scoped_sprint_proposal(UUID,UUID,TIMESTAMPTZ,TEXT,TEXT,JSONB) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.platform_persist_scoped_sprint_proposal(UUID,UUID,TIMESTAMPTZ,TEXT,TEXT,JSONB) TO service_role;
