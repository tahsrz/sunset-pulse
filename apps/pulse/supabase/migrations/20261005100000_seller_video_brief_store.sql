-- Private, append-only storage for seller video brief drafts. This records
-- reviewed source material; it does not publish or send content.
CREATE TABLE public.seller_video_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.platform_workspaces(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brief_id UUID NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0),
  backlog_item_id UUID REFERENCES public.sprint_backlog_items(id) ON DELETE RESTRICT,
  backlog_item_revision INTEGER CHECK (backlog_item_revision IS NULL OR backlog_item_revision > 0),
  brief_data JSONB NOT NULL CHECK (jsonb_typeof(brief_data) = 'object' AND octet_length(brief_data::TEXT) <= 32768),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, brief_id, revision),
  CHECK (brief_data ? 'backlogLink'),
  CHECK (brief_data->>'schemaVersion' = '1'),
  CHECK (brief_data->>'briefId' = brief_id::TEXT),
  CHECK ((brief_data->>'revision')::INTEGER = revision),
  CHECK (brief_data->>'reviewStatus' = 'draft'),
  CHECK (brief_data->'reviewedByUserId' = 'null'::JSONB AND brief_data->'reviewedAt' = 'null'::JSONB),
  CHECK (
    (backlog_item_id IS NULL AND backlog_item_revision IS NULL AND brief_data->'backlogLink' = 'null'::JSONB)
    OR (
      backlog_item_id IS NOT NULL AND backlog_item_revision IS NOT NULL
      AND jsonb_typeof(brief_data->'backlogLink') = 'object'
      AND brief_data #>> '{backlogLink,itemId}' = backlog_item_id::TEXT
      AND (brief_data #>> '{backlogLink,expectedRevision}')::INTEGER = backlog_item_revision
    )
  )
);

CREATE INDEX seller_video_briefs_workspace_created_idx
  ON public.seller_video_briefs(workspace_id, created_at DESC, id DESC);
CREATE INDEX seller_video_briefs_backlog_link_idx
  ON public.seller_video_briefs(workspace_id, backlog_item_id, backlog_item_revision)
  WHERE backlog_item_id IS NOT NULL;

ALTER TABLE public.seller_video_briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY seller_video_briefs_member_read
  ON public.seller_video_briefs FOR SELECT TO authenticated
  USING (public.platform_is_workspace_member(workspace_id));
REVOKE ALL ON public.seller_video_briefs FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.seller_video_briefs TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.reject_seller_video_brief_mutation()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Seller video brief revisions are immutable' USING ERRCODE = '55000';
END;
$$;
CREATE TRIGGER seller_video_briefs_immutable
  BEFORE UPDATE OR DELETE ON public.seller_video_briefs
  FOR EACH ROW EXECUTE FUNCTION public.reject_seller_video_brief_mutation();

CREATE OR REPLACE FUNCTION public.platform_save_seller_video_brief(
  p_actor_id UUID,
  p_workspace_id UUID,
  p_brief JSONB
)
RETURNS TABLE(saved_brief JSONB, reused BOOLEAN, saved_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  saved public.seller_video_briefs%ROWTYPE;
  membership_role TEXT;
  linked_owner UUID;
  linked_item public.sprint_backlog_items%ROWTYPE;
  linked_id UUID;
  expected_backlog_revision INTEGER;
  brief_uuid UUID;
  brief_revision INTEGER;
BEGIN
  membership_role := public.platform_require_run_role(p_actor_id, p_workspace_id, ARRAY['owner','admin','member']);
  IF p_brief IS NULL OR jsonb_typeof(p_brief) <> 'object'
    OR octet_length(p_brief::TEXT) > 32768
    OR p_brief->>'schemaVersion' IS DISTINCT FROM '1'
    OR p_brief->>'reviewStatus' IS DISTINCT FROM 'draft'
    OR p_brief->'reviewedByUserId' IS DISTINCT FROM 'null'::JSONB
    OR p_brief->'reviewedAt' IS DISTINCT FROM 'null'::JSONB
    OR NOT (p_brief ? 'backlogLink') THEN
    RAISE EXCEPTION 'Only a valid, unreviewed seller video brief draft can be saved' USING ERRCODE = '22023';
  END IF;

  BEGIN
    brief_uuid := (p_brief->>'briefId')::UUID;
    brief_revision := (p_brief->>'revision')::INTEGER;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Seller video brief identity is invalid' USING ERRCODE = '22023';
  END;
  IF brief_revision IS NULL OR brief_revision < 1 THEN
    RAISE EXCEPTION 'Seller video brief revision is invalid' USING ERRCODE = '22023';
  END IF;

  IF p_brief->'backlogLink' <> 'null'::JSONB THEN
    IF jsonb_typeof(p_brief->'backlogLink') IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'Backlog link must be an object or null' USING ERRCODE = '22023';
    END IF;
    BEGIN
      linked_id := (p_brief #>> '{backlogLink,itemId}')::UUID;
      expected_backlog_revision := (p_brief #>> '{backlogLink,expectedRevision}')::INTEGER;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Backlog link identity is invalid' USING ERRCODE = '22023';
    END;
    IF linked_id IS NULL OR expected_backlog_revision IS NULL OR expected_backlog_revision < 1 THEN
      RAISE EXCEPTION 'Backlog link identity is invalid' USING ERRCODE = '22023';
    END IF;

    SELECT scope.owner_id INTO linked_owner
      FROM public.platform_scope_links AS scope
      WHERE scope.workspace_id = p_workspace_id
        AND scope.resource_type = 'sprint_backlog_item'
        AND scope.resource_id = linked_id::TEXT
        AND scope.status = 'mapped'
      FOR SHARE;
    IF linked_owner IS NULL THEN
      RAISE EXCEPTION 'Linked backlog item is not available in this workspace' USING ERRCODE = 'P0002';
    END IF;

    SELECT backlog.* INTO linked_item
      FROM public.sprint_backlog_items AS backlog
      WHERE backlog.id = linked_id AND backlog.owner_id = linked_owner
      FOR UPDATE;
    IF NOT FOUND OR linked_item.status = 'cancelled' THEN
      RAISE EXCEPTION 'Linked backlog item is unavailable' USING ERRCODE = 'P0002';
    END IF;
    IF linked_item.revision <> expected_backlog_revision THEN
      RAISE EXCEPTION 'Linked backlog item revision is stale' USING ERRCODE = '40001';
    END IF;
  END IF;

  INSERT INTO public.seller_video_briefs AS target (
    workspace_id, owner_id, brief_id, revision, backlog_item_id,
    backlog_item_revision, brief_data
  ) VALUES (
    p_workspace_id, p_actor_id, brief_uuid, brief_revision, linked_id,
    expected_backlog_revision, p_brief
  )
  ON CONFLICT (workspace_id, brief_id, revision) DO NOTHING
  RETURNING target.* INTO saved;

  IF NOT FOUND THEN
    SELECT existing.* INTO saved
      FROM public.seller_video_briefs AS existing
      WHERE existing.workspace_id = p_workspace_id
        AND existing.brief_id = brief_uuid
        AND existing.revision = brief_revision
      FOR SHARE;
    IF saved.id IS NULL OR saved.owner_id <> p_actor_id
      OR saved.brief_data IS DISTINCT FROM p_brief
      OR saved.backlog_item_id IS DISTINCT FROM linked_id
      OR saved.backlog_item_revision IS DISTINCT FROM expected_backlog_revision THEN
      RAISE EXCEPTION 'Seller video brief revision already exists with different content' USING ERRCODE = '23505';
    END IF;
    RETURN QUERY SELECT saved.brief_data, TRUE, saved.created_at;
    RETURN;
  END IF;

  RETURN QUERY SELECT saved.brief_data, FALSE, saved.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_save_seller_video_brief(UUID, UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.platform_save_seller_video_brief(UUID, UUID, JSONB) TO service_role;
