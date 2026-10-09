-- Exact-revision human review for private seller video drafts. This records a
-- workflow checkpoint only: approval never publishes or sends the draft.

CREATE UNIQUE INDEX platform_runs_seller_video_review_target_idx
  ON public.platform_runs (
    workspace_id,
    (definition#>>'{nodes,0,target,resourceId}'),
    (definition#>>'{nodes,0,target,revision}')
  ) WHERE definition->>'key' = 'seller_video_review';

CREATE FUNCTION public.platform_start_seller_video_review(
  p_actor_id UUID,
  p_workspace_id UUID,
  p_brief_id UUID,
  p_revision INTEGER,
  p_request_key UUID
)
RETURNS SETOF public.platform_runs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  brief public.seller_video_briefs%ROWTYPE;
  linked_owner UUID;
  linked_item public.sprint_backlog_items%ROWTYPE;
  brief_hash TEXT;
  definition JSONB;
  existing public.platform_runs%ROWTYPE;
BEGIN
  PERFORM public.platform_require_run_role(p_actor_id,p_workspace_id,ARRAY['owner','admin','member']);
  IF p_brief_id IS NULL OR p_revision IS NULL OR p_revision < 1 OR p_request_key IS NULL THEN
    RAISE EXCEPTION 'Seller video review identity is invalid' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO brief FROM public.seller_video_briefs
  WHERE workspace_id = p_workspace_id AND brief_id = p_brief_id AND revision = p_revision
  FOR UPDATE;
  IF NOT FOUND OR brief.brief_data->>'reviewStatus' <> 'draft' THEN
    RAISE EXCEPTION 'Only an existing unreviewed seller video draft can be reviewed' USING ERRCODE = 'P0002';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.seller_video_briefs successor
    WHERE successor.workspace_id = brief.workspace_id
      AND successor.brief_data->>'supersedesBriefId' = brief.brief_id::TEXT
  ) THEN
    RAISE EXCEPTION 'A superseded seller video draft cannot be reviewed' USING ERRCODE = '40001';
  END IF;

  IF brief.backlog_item_id IS NOT NULL THEN
    SELECT scope.owner_id INTO linked_owner FROM public.platform_scope_links AS scope
    WHERE scope.workspace_id = p_workspace_id AND scope.resource_type = 'sprint_backlog_item'
      AND scope.resource_id = brief.backlog_item_id::TEXT AND scope.status = 'mapped'
    FOR SHARE;
    IF linked_owner IS NULL THEN
      RAISE EXCEPTION 'Linked backlog item is not available in this workspace' USING ERRCODE = 'P0002';
    END IF;
    SELECT backlog.* INTO linked_item FROM public.sprint_backlog_items AS backlog
    WHERE backlog.id = brief.backlog_item_id AND backlog.owner_id = linked_owner
    FOR SHARE;
    IF NOT FOUND OR linked_item.status = 'cancelled' THEN
      RAISE EXCEPTION 'Linked backlog item is unavailable' USING ERRCODE = 'P0002';
    END IF;
    IF linked_item.revision <> brief.backlog_item_revision THEN
      RAISE EXCEPTION 'Linked backlog item revision is stale' USING ERRCODE = '40001';
    END IF;
  END IF;

  brief_hash := encode(sha256(convert_to(brief.brief_data::TEXT,'UTF8')),'hex');
  -- One review run per immutable brief revision, even if the caller retries
  -- with a different request key after a network timeout.
  SELECT * INTO existing FROM public.platform_runs run
  WHERE run.workspace_id = p_workspace_id
    AND run.definition->>'key' = 'seller_video_review'
    AND run.definition#>>'{nodes,0,target,resourceId}' = p_brief_id::TEXT
    AND run.definition#>>'{nodes,0,target,revision}' = p_revision::TEXT
    AND run.definition#>>'{nodes,0,target,resourceType}' = 'seller_video_brief'
    AND run.definition#>>'{nodes,0,target,action}' = 'review_seller_video_brief'
    AND run.definition#>>'{nodes,0,target,contentHash}' = brief_hash
  ORDER BY run.created_at LIMIT 1;
  IF FOUND THEN RETURN NEXT existing; RETURN; END IF;

  definition := jsonb_build_object(
    'schemaVersion',1,'key','seller_video_review','version',1,'entry','review',
    'nodes',jsonb_build_array(
      jsonb_build_object(
        'id','review','kind','checkpoint','type','approval','next','complete',
        'prompt','Review this exact private seller video draft. Approve or reject this revision only; this does not publish or send content.',
        'target',jsonb_build_object(
          'resourceType','seller_video_brief','resourceId',p_brief_id::TEXT,
          'revision',p_revision,'contentHash',brief_hash,'action','review_seller_video_brief'
        )
      ),
      jsonb_build_object('id','complete','kind','complete')
    )
  );
  RETURN QUERY SELECT * FROM public.platform_start_run(p_actor_id,p_workspace_id,p_request_key,definition);
END;
$$;

CREATE FUNCTION public.platform_respond_seller_video_review(
  p_actor_id UUID,
  p_workspace_id UUID,
  p_checkpoint_id UUID,
  p_expected_revision INTEGER,
  p_submission_key UUID,
  p_decision BOOLEAN
)
RETURNS SETOF public.platform_checkpoints
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  member_role TEXT;
  cp public.platform_checkpoints%ROWTYPE;
  saved public.platform_runs%ROWTYPE;
  brief public.seller_video_briefs%ROWTYPE;
  linked_owner UUID;
  linked_item public.sprint_backlog_items%ROWTYPE;
  target JSONB;
  actual_hash TEXT;
BEGIN
  member_role := public.platform_require_run_role(p_actor_id,p_workspace_id,ARRAY['owner','admin','reviewer']);
  SELECT * INTO cp FROM public.platform_checkpoints
  WHERE id = p_checkpoint_id AND workspace_id = p_workspace_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Checkpoint not found' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO saved FROM public.platform_runs
  WHERE id = cp.run_id AND workspace_id = p_workspace_id FOR UPDATE;
  SELECT * INTO cp FROM public.platform_checkpoints WHERE id = p_checkpoint_id FOR UPDATE;

  IF cp.type <> 'approval' OR cp.status NOT IN ('pending','resolved') THEN
    RAISE EXCEPTION 'Seller video review checkpoint is unavailable' USING ERRCODE = '40001';
  END IF;
  IF cp.status = 'resolved' THEN
    RETURN QUERY SELECT * FROM public.platform_respond_checkpoint(
      p_actor_id,p_workspace_id,p_checkpoint_id,p_expected_revision,p_submission_key,to_jsonb(p_decision)
    );
    RETURN;
  END IF;

  target := cp.target;
  IF target->>'resourceType' IS DISTINCT FROM 'seller_video_brief'
    OR target->>'action' IS DISTINCT FROM 'review_seller_video_brief'
    OR saved.definition->>'key' IS DISTINCT FROM 'seller_video_review' THEN
    RAISE EXCEPTION 'Checkpoint is not a seller video review' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO brief FROM public.seller_video_briefs
  WHERE workspace_id = p_workspace_id AND brief_id::TEXT = target->>'resourceId'
    AND revision = (target->>'revision')::INTEGER
  FOR SHARE;
  IF NOT FOUND OR brief.brief_data->>'reviewStatus' <> 'draft' THEN
    RAISE EXCEPTION 'Reviewed seller video revision is unavailable' USING ERRCODE = '40001';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.seller_video_briefs successor
    WHERE successor.workspace_id = brief.workspace_id
      AND successor.brief_data->>'supersedesBriefId' = brief.brief_id::TEXT
  ) THEN
    RAISE EXCEPTION 'A superseded seller video draft cannot be approved' USING ERRCODE = '40001';
  END IF;
  actual_hash := encode(sha256(convert_to(brief.brief_data::TEXT,'UTF8')),'hex');
  IF actual_hash IS DISTINCT FROM target->>'contentHash' THEN
    RAISE EXCEPTION 'Seller video draft content changed after review began' USING ERRCODE = '40001';
  END IF;
  IF p_decision AND (
    brief.brief_data#>>'{listingPermission,status}' IN ('pending','denied')
    OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(brief.brief_data->'claimEvidence') = 'array'
          THEN brief.brief_data->'claimEvidence' ELSE '[]'::JSONB END
      ) evidence
      WHERE evidence->>'sourceDate' IS NULL
        OR evidence->>'publicationBasis' IN ('internal-only','unknown')
        OR evidence->'permissionEvidence' IS NULL
        OR evidence->'permissionEvidence' = 'null'::JSONB
        OR char_length(btrim(evidence->>'permissionEvidence')) < 8
    )
  ) THEN
    RAISE EXCEPTION 'Seller video claims and listing-media use need cleared publication evidence before approval' USING ERRCODE = '22023';
  END IF;

  IF brief.backlog_item_id IS NOT NULL THEN
    SELECT scope.owner_id INTO linked_owner FROM public.platform_scope_links AS scope
    WHERE scope.workspace_id = p_workspace_id AND scope.resource_type = 'sprint_backlog_item'
      AND scope.resource_id = brief.backlog_item_id::TEXT AND scope.status = 'mapped'
    FOR SHARE;
    IF linked_owner IS NULL THEN
      RAISE EXCEPTION 'Linked backlog item is not available in this workspace' USING ERRCODE = 'P0002';
    END IF;
    SELECT backlog.* INTO linked_item FROM public.sprint_backlog_items AS backlog
    WHERE backlog.id = brief.backlog_item_id AND backlog.owner_id = linked_owner
    FOR SHARE;
    IF NOT FOUND OR linked_item.status = 'cancelled' THEN
      RAISE EXCEPTION 'Linked backlog item is unavailable' USING ERRCODE = 'P0002';
    END IF;
    IF linked_item.revision <> brief.backlog_item_revision THEN
      RAISE EXCEPTION 'Linked backlog item revision is stale' USING ERRCODE = '40001';
    END IF;
  END IF;

  RETURN QUERY SELECT * FROM public.platform_respond_checkpoint(
    p_actor_id,p_workspace_id,p_checkpoint_id,p_expected_revision,p_submission_key,to_jsonb(p_decision)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.platform_start_seller_video_review(UUID,UUID,UUID,INTEGER,UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.platform_respond_seller_video_review(UUID,UUID,UUID,INTEGER,UUID,BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.platform_start_seller_video_review(UUID,UUID,UUID,INTEGER,UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.platform_respond_seller_video_review(UUID,UUID,UUID,INTEGER,UUID,BOOLEAN) TO service_role;
