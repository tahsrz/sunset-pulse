-- Private, owner-entered records of posts already published manually. This
-- migration adds no social API, upload, outbound message, or posting worker.
CREATE TABLE public.seller_video_publication_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.platform_workspaces(id) ON DELETE CASCADE,
  brief_id UUID NOT NULL,
  brief_revision INTEGER NOT NULL CHECK (brief_revision > 0),
  review_checkpoint_id UUID NOT NULL REFERENCES public.platform_checkpoints(id) ON DELETE RESTRICT,
  content_hash TEXT NOT NULL CHECK (content_hash ~ '^[0-9a-f]{64}$'),
  platform TEXT NOT NULL CHECK (platform IN ('tiktok','instagram-reels','youtube-shorts')),
  public_url TEXT NOT NULL CHECK (char_length(public_url) BETWEEN 12 AND 2000),
  published_at TIMESTAMPTZ NOT NULL CHECK (published_at <= now()),
  request_key UUID NOT NULL,
  entered_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (workspace_id, brief_id, brief_revision)
    REFERENCES public.seller_video_briefs(workspace_id, brief_id, revision) ON DELETE RESTRICT,
  UNIQUE (workspace_id, request_key),
  UNIQUE (workspace_id, brief_id, brief_revision, platform)
);

CREATE INDEX seller_video_publications_workspace_created_idx
  ON public.seller_video_publication_records(workspace_id, created_at DESC, id DESC);

ALTER TABLE public.seller_video_publication_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.seller_video_publication_records FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.seller_video_publication_records TO service_role;

CREATE FUNCTION public.platform_record_seller_video_publication(
  p_actor_id UUID,
  p_workspace_id UUID,
  p_brief_id UUID,
  p_revision INTEGER,
  p_platform TEXT,
  p_public_url TEXT,
  p_published_at TIMESTAMPTZ,
  p_request_key UUID
)
RETURNS TABLE(publication JSONB, reused BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  brief public.seller_video_briefs%ROWTYPE;
  approved_run public.platform_runs%ROWTYPE;
  approved_checkpoint public.platform_checkpoints%ROWTYPE;
  linked_owner UUID;
  linked_item public.sprint_backlog_items%ROWTYPE;
  actual_hash TEXT;
  saved public.seller_video_publication_records%ROWTYPE;
BEGIN
  PERFORM public.platform_require_run_role(p_actor_id,p_workspace_id,ARRAY['owner','admin']);
  IF p_brief_id IS NULL OR p_revision IS NULL OR p_revision < 1 OR p_request_key IS NULL
    OR p_platform NOT IN ('tiktok','instagram-reels','youtube-shorts')
    OR p_public_url IS NULL OR char_length(p_public_url) NOT BETWEEN 12 AND 2000
    OR p_public_url !~ '^https://'
    OR p_published_at IS NULL OR p_published_at > now() THEN
    RAISE EXCEPTION 'Seller video publication record is invalid' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO brief FROM public.seller_video_briefs
  WHERE workspace_id = p_workspace_id AND brief_id = p_brief_id AND revision = p_revision
  FOR SHARE;
  IF NOT FOUND OR brief.brief_data->>'reviewStatus' <> 'draft' THEN
    RAISE EXCEPTION 'Seller video draft revision is unavailable' USING ERRCODE = 'P0002';
  END IF;
  actual_hash := encode(sha256(convert_to(brief.brief_data::TEXT,'UTF8')),'hex');

  SELECT record.* INTO saved FROM public.seller_video_publication_records AS record
  WHERE record.workspace_id = p_workspace_id AND record.request_key = p_request_key
  FOR UPDATE;
  IF FOUND THEN
    IF saved.brief_id <> p_brief_id OR saved.brief_revision <> p_revision
      OR saved.content_hash <> actual_hash OR saved.platform <> p_platform
      OR saved.public_url <> p_public_url OR saved.published_at <> p_published_at
      OR saved.entered_by <> p_actor_id THEN
      RAISE EXCEPTION 'Publication idempotency key was reused with different content' USING ERRCODE = '23505';
    END IF;
    RETURN QUERY SELECT to_jsonb(saved), TRUE;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.seller_video_briefs successor
    WHERE successor.workspace_id = brief.workspace_id
      AND successor.brief_data->>'supersedesBriefId' = brief.brief_id::TEXT
  ) THEN
    RAISE EXCEPTION 'A superseded seller video draft cannot be recorded as published' USING ERRCODE = '40001';
  END IF;
  SELECT run.* INTO approved_run
  FROM public.platform_runs AS run
  WHERE run.workspace_id = p_workspace_id
    AND run.definition->>'key' = 'seller_video_review'
    AND run.status = 'completed'
    AND run.definition#>>'{nodes,0,target,resourceType}' = 'seller_video_brief'
    AND run.definition#>>'{nodes,0,target,action}' = 'review_seller_video_brief'
    AND run.definition#>>'{nodes,0,target,resourceId}' = p_brief_id::TEXT
    AND run.definition#>>'{nodes,0,target,revision}' = p_revision::TEXT
    AND run.definition#>>'{nodes,0,target,contentHash}' = actual_hash
  ORDER BY run.created_at DESC LIMIT 1
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'An approved review for this exact brief revision is required' USING ERRCODE = '42501';
  END IF;

  SELECT checkpoint.* INTO approved_checkpoint
  FROM public.platform_checkpoints AS checkpoint
  WHERE checkpoint.workspace_id = p_workspace_id AND checkpoint.run_id = approved_run.id
    AND checkpoint.type = 'approval' AND checkpoint.status = 'resolved'
    AND checkpoint.response = 'true'::JSONB
    AND checkpoint.target->>'resourceType' = 'seller_video_brief'
    AND checkpoint.target->>'action' = 'review_seller_video_brief'
    AND checkpoint.target->>'resourceId' = p_brief_id::TEXT
    AND checkpoint.target->>'revision' = p_revision::TEXT
    AND checkpoint.target->>'contentHash' = actual_hash
  ORDER BY checkpoint.resolved_at DESC, checkpoint.id DESC LIMIT 1
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'An approved review checkpoint for this exact brief revision is required' USING ERRCODE = '42501';
  END IF;

  IF NOT (brief.brief_data->'channels' ? p_platform)
    OR brief.brief_data#>>'{listingPermission,status}' NOT IN ('not-needed','granted')
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
    ) THEN
    RAISE EXCEPTION 'Platform, claim evidence, and media permission must match the approved draft' USING ERRCODE = '22023';
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
    IF NOT FOUND OR linked_item.status = 'cancelled'
      OR linked_item.revision <> brief.backlog_item_revision THEN
      RAISE EXCEPTION 'Linked backlog item revision is no longer current' USING ERRCODE = '40001';
    END IF;
  END IF;

  INSERT INTO public.seller_video_publication_records AS target (
    workspace_id, brief_id, brief_revision, review_checkpoint_id, content_hash,
    platform, public_url, published_at, request_key, entered_by
  ) VALUES (
    p_workspace_id, p_brief_id, p_revision, approved_checkpoint.id, actual_hash,
    p_platform, p_public_url, p_published_at, p_request_key, p_actor_id
  ) ON CONFLICT DO NOTHING RETURNING target.* INTO saved;

  IF NOT FOUND THEN
    SELECT record.* INTO saved FROM public.seller_video_publication_records AS record
    WHERE record.workspace_id = p_workspace_id
      AND (record.request_key = p_request_key OR
        (record.brief_id = p_brief_id AND record.brief_revision = p_revision AND record.platform = p_platform))
    ORDER BY record.created_at LIMIT 1 FOR UPDATE;
    IF saved.id IS NULL OR saved.brief_id <> p_brief_id OR saved.brief_revision <> p_revision
      OR saved.content_hash <> actual_hash OR saved.review_checkpoint_id <> approved_checkpoint.id
      OR saved.platform <> p_platform OR saved.public_url <> p_public_url
      OR saved.published_at <> p_published_at OR saved.entered_by <> p_actor_id THEN
      RAISE EXCEPTION 'Publication record conflicts with an existing request or platform post' USING ERRCODE = '23505';
    END IF;
    RETURN QUERY SELECT to_jsonb(saved), TRUE;
    RETURN;
  END IF;

  RETURN QUERY SELECT to_jsonb(saved), FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_record_seller_video_publication(UUID,UUID,UUID,INTEGER,TEXT,TEXT,TIMESTAMPTZ,UUID)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.platform_record_seller_video_publication(UUID,UUID,UUID,INTEGER,TEXT,TEXT,TIMESTAMPTZ,UUID)
  TO service_role;
