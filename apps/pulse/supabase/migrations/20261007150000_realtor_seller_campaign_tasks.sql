-- Permit only owner-authored seller acquisition backlog rows to bridge into
-- property-free personal planner tasks. Property shortlist linkage remains on
-- the existing wrapper; seller leads remain handled by their own wrapper.
ALTER FUNCTION public.realtor_save_planner_item(UUID,UUID,UUID,INTEGER,UUID,JSONB,JSONB)
  RENAME TO realtor_save_planner_item_without_campaign_identity;

CREATE FUNCTION public.realtor_save_planner_item(
  p_actor_id UUID, p_workspace_id UUID, p_item_id UUID, p_expected_revision INTEGER,
  p_request_key UUID, p_item JSONB, p_occurrences JSONB
) RETURNS TABLE(item_id UUID, revision INTEGER, reused BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  source_task_id UUID;
  source_task public.sprint_backlog_items%ROWTYPE;
  linked_task_id UUID;
  saved_id UUID;
  saved_revision INTEGER;
  was_reused BOOLEAN;
BEGIN
  IF p_item_id IS NOT NULL AND NULLIF(p_item->>'sourceSprintTaskId','') IS NOT NULL THEN
    RAISE EXCEPTION 'A sprint task can only be linked when creating its planner item' USING ERRCODE='22023';
  END IF;
  source_task_id := NULLIF(p_item->>'sourceSprintTaskId','')::UUID;

  IF source_task_id IS NULL OR p_item->'property' IS DISTINCT FROM 'null'::JSONB THEN
    RETURN QUERY SELECT * FROM public.realtor_save_planner_item_without_campaign_identity(
      p_actor_id,p_workspace_id,p_item_id,p_expected_revision,p_request_key,p_item,p_occurrences);
    RETURN;
  END IF;

  IF p_item->>'kind'<>'task' OR COALESCE(p_item->'sellerLead','null'::JSONB)<>'null'::JSONB
    OR NOT public.realtor_personal_access(p_actor_id,p_workspace_id) THEN
    RAISE EXCEPTION 'Invalid seller campaign task link' USING ERRCODE='22023';
  END IF;
  PERFORM 1 FROM public.platform_workspaces workspace
    WHERE workspace.id=p_workspace_id AND workspace.kind='personal'
      AND workspace.created_by=p_actor_id AND workspace.status='active' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Personal planner access denied' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.platform_memberships membership
    WHERE membership.workspace_id=p_workspace_id AND membership.user_id=p_actor_id
      AND membership.role='owner' AND membership.status='active' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Personal planner access denied' USING ERRCODE='42501'; END IF;

  SELECT task.* INTO source_task FROM public.sprint_backlog_items task
    WHERE task.id=source_task_id AND task.owner_id=p_actor_id AND task.source_type='manual'
      AND task.source_id ~ '^seller-acquisition:([0-9]{4}-W[0-9]{2}|[0-9]{4}-[0-9]{2}-[0-9]{2}):[a-z0-9-]+$'
      AND task.status IN ('open','in_progress')
    FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Seller acquisition task is unavailable' USING ERRCODE='P0002'; END IF;

  IF p_item_id IS NOT NULL THEN
    SELECT planner.source_sprint_task_id INTO linked_task_id
      FROM public.realtor_planner_items planner
      WHERE planner.id=p_item_id AND planner.user_id=p_actor_id AND planner.workspace_id=p_workspace_id
      FOR UPDATE;
    IF NOT FOUND OR linked_task_id IS DISTINCT FROM source_task_id THEN
      RAISE EXCEPTION 'Planner task source cannot be changed' USING ERRCODE='22023';
    END IF;
    RETURN QUERY SELECT * FROM public.realtor_save_planner_item_without_task_identity(
      p_actor_id,p_workspace_id,p_item_id,p_expected_revision,p_request_key,
      p_item-'sourceSprintTaskId',p_occurrences);
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.realtor_planner_items planner
      WHERE planner.user_id=p_actor_id AND planner.source_sprint_task_id=source_task_id) THEN
    RAISE EXCEPTION 'Seller acquisition task was already scheduled' USING ERRCODE='23505';
  END IF;
  SELECT saved.item_id,saved.revision,saved.reused INTO saved_id,saved_revision,was_reused
    FROM public.realtor_save_planner_item_without_task_identity(
      p_actor_id,p_workspace_id,NULL,NULL,p_request_key,p_item-'sourceSprintTaskId',p_occurrences) saved;
  UPDATE public.realtor_planner_items planner SET source_sprint_task_id=source_task_id
    WHERE planner.id=saved_id AND planner.user_id=p_actor_id AND planner.workspace_id=p_workspace_id
      AND planner.source_sprint_task_id IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Seller acquisition task was already scheduled' USING ERRCODE='23505'; END IF;
  RETURN QUERY SELECT saved_id,saved_revision,was_reused;
END $$;

REVOKE ALL ON FUNCTION public.realtor_save_planner_item_without_campaign_identity(UUID,UUID,UUID,INTEGER,UUID,JSONB,JSONB)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.realtor_save_planner_item_without_campaign_identity(UUID,UUID,UUID,INTEGER,UUID,JSONB,JSONB)
  TO service_role;
REVOKE ALL ON FUNCTION public.realtor_save_planner_item(UUID,UUID,UUID,INTEGER,UUID,JSONB,JSONB)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.realtor_save_planner_item(UUID,UUID,UUID,INTEGER,UUID,JSONB,JSONB)
  TO service_role;
