-- Immutable, owner-entered measurements for posts published outside Pulse.
-- No platform API, scraping, attribution inference, or publishing worker.
CREATE TABLE public.seller_video_publication_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.platform_workspaces(id) ON DELETE CASCADE,
  publication_id UUID NOT NULL REFERENCES public.seller_video_publication_records(id) ON DELETE RESTRICT,
  captured_at TIMESTAMPTZ NOT NULL CHECK (captured_at <= now()),
  views BIGINT NOT NULL CHECK (views BETWEEN 0 AND 1000000000),
  engagements BIGINT NOT NULL CHECK (engagements BETWEEN 0 AND 1000000000 AND engagements <= views),
  link_clicks BIGINT NOT NULL CHECK (link_clicks BETWEEN 0 AND 1000000000),
  seller_plan_requests BIGINT NOT NULL CHECK (seller_plan_requests BETWEEN 0 AND 1000000000),
  source_note TEXT NOT NULL CHECK (char_length(btrim(source_note)) BETWEEN 8 AND 500),
  request_key UUID NOT NULL,
  entered_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, request_key),
  UNIQUE (workspace_id, publication_id, captured_at)
);

CREATE INDEX seller_video_outcomes_workspace_publication_idx
  ON public.seller_video_publication_outcomes(workspace_id, publication_id, captured_at DESC, id DESC);

ALTER TABLE public.seller_video_publication_outcomes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.seller_video_publication_outcomes FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.seller_video_publication_outcomes TO service_role;

CREATE FUNCTION public.platform_record_seller_video_publication_outcome(
  p_actor_id UUID,
  p_workspace_id UUID,
  p_publication_id UUID,
  p_captured_at TIMESTAMPTZ,
  p_views BIGINT,
  p_engagements BIGINT,
  p_link_clicks BIGINT,
  p_seller_plan_requests BIGINT,
  p_source_note TEXT,
  p_request_key UUID
)
RETURNS TABLE(outcome JSONB, reused BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  publication public.seller_video_publication_records%ROWTYPE;
  saved public.seller_video_publication_outcomes%ROWTYPE;
BEGIN
  PERFORM public.platform_require_run_role(p_actor_id, p_workspace_id, ARRAY['owner','admin']);
  IF p_publication_id IS NULL OR p_request_key IS NULL OR p_captured_at IS NULL OR p_captured_at > now()
    OR p_views NOT BETWEEN 0 AND 1000000000
    OR p_engagements NOT BETWEEN 0 AND p_views
    OR p_link_clicks NOT BETWEEN 0 AND 1000000000
    OR p_seller_plan_requests NOT BETWEEN 0 AND 1000000000
    OR p_source_note IS NULL OR char_length(btrim(p_source_note)) NOT BETWEEN 8 AND 500 THEN
    RAISE EXCEPTION 'Seller video outcome snapshot is invalid' USING ERRCODE = '22023';
  END IF;

  SELECT record.* INTO publication FROM public.seller_video_publication_records AS record
  WHERE record.workspace_id = p_workspace_id AND record.id = p_publication_id
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Publication record is unavailable in this workspace' USING ERRCODE = 'P0002';
  END IF;

  SELECT record.* INTO saved FROM public.seller_video_publication_outcomes AS record
  WHERE record.workspace_id = p_workspace_id AND record.request_key = p_request_key
  FOR UPDATE;
  IF FOUND THEN
    IF saved.publication_id <> p_publication_id OR saved.captured_at <> p_captured_at
      OR saved.views <> p_views OR saved.engagements <> p_engagements
      OR saved.link_clicks <> p_link_clicks OR saved.seller_plan_requests <> p_seller_plan_requests
      OR saved.source_note <> btrim(p_source_note) OR saved.entered_by <> p_actor_id THEN
      RAISE EXCEPTION 'Outcome idempotency key was reused with different content' USING ERRCODE = '23505';
    END IF;
    RETURN QUERY SELECT to_jsonb(saved), TRUE;
    RETURN;
  END IF;

  INSERT INTO public.seller_video_publication_outcomes AS target (
    workspace_id, publication_id, captured_at, views, engagements, link_clicks,
    seller_plan_requests, source_note, request_key, entered_by
  ) VALUES (
    p_workspace_id, p_publication_id, p_captured_at, p_views, p_engagements,
    p_link_clicks, p_seller_plan_requests, btrim(p_source_note), p_request_key, p_actor_id
  ) ON CONFLICT DO NOTHING RETURNING target.* INTO saved;

  IF NOT FOUND THEN
    SELECT record.* INTO saved FROM public.seller_video_publication_outcomes AS record
    WHERE record.workspace_id = p_workspace_id AND record.publication_id = p_publication_id
      AND record.captured_at = p_captured_at
    FOR UPDATE;
    IF saved.id IS NULL OR saved.views <> p_views OR saved.engagements <> p_engagements
      OR saved.link_clicks <> p_link_clicks OR saved.seller_plan_requests <> p_seller_plan_requests
      OR saved.source_note <> btrim(p_source_note) OR saved.entered_by <> p_actor_id THEN
      RAISE EXCEPTION 'Outcome snapshot conflicts with an existing capture' USING ERRCODE = '23505';
    END IF;
    RETURN QUERY SELECT to_jsonb(saved), TRUE;
    RETURN;
  END IF;
  RETURN QUERY SELECT to_jsonb(saved), FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_record_seller_video_publication_outcome(UUID,UUID,UUID,TIMESTAMPTZ,BIGINT,BIGINT,BIGINT,BIGINT,TEXT,UUID)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.platform_record_seller_video_publication_outcome(UUID,UUID,UUID,TIMESTAMPTZ,BIGINT,BIGINT,BIGINT,BIGINT,TEXT,UUID)
  TO service_role;
