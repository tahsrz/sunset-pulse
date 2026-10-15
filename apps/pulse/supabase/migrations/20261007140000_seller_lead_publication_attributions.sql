-- Owner-declared association between an existing seller inquiry and a known
-- manually published post. This is not causal attribution or a send action.
CREATE TABLE public.seller_lead_publication_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.platform_workspaces(id) ON DELETE CASCADE,
  publication_id UUID NOT NULL REFERENCES public.seller_video_publication_records(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.agent_site_leads(id) ON DELETE RESTRICT,
  attribution_kind TEXT NOT NULL DEFAULT 'owner_reported' CHECK (attribution_kind = 'owner_reported'),
  evidence_note TEXT NOT NULL CHECK (char_length(btrim(evidence_note)) BETWEEN 12 AND 500),
  request_key UUID NOT NULL,
  entered_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, request_key),
  UNIQUE (workspace_id, lead_id)
);

CREATE INDEX seller_lead_publication_attributions_workspace_idx
  ON public.seller_lead_publication_attributions(workspace_id, created_at DESC, id DESC);

ALTER TABLE public.seller_lead_publication_attributions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.seller_lead_publication_attributions FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.seller_lead_publication_attributions TO service_role;

CREATE FUNCTION public.platform_record_seller_lead_publication_attribution(
  p_actor_id UUID,
  p_workspace_id UUID,
  p_publication_id UUID,
  p_lead_id UUID,
  p_evidence_note TEXT,
  p_request_key UUID
)
RETURNS TABLE(attribution JSONB, reused BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  publication public.seller_video_publication_records%ROWTYPE;
  seller_lead public.agent_site_leads%ROWTYPE;
  saved public.seller_lead_publication_attributions%ROWTYPE;
BEGIN
  PERFORM public.platform_require_run_role(p_actor_id,p_workspace_id,ARRAY['owner','admin']);
  IF p_publication_id IS NULL OR p_lead_id IS NULL OR p_request_key IS NULL
    OR p_evidence_note IS NULL OR char_length(btrim(p_evidence_note)) NOT BETWEEN 12 AND 500 THEN
    RAISE EXCEPTION 'Seller lead attribution is invalid' USING ERRCODE = '22023';
  END IF;

  SELECT record.* INTO publication FROM public.seller_video_publication_records AS record
  WHERE record.workspace_id = p_workspace_id AND record.id = p_publication_id
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Publication record is unavailable in this workspace' USING ERRCODE = 'P0002';
  END IF;

  SELECT lead.* INTO seller_lead FROM public.agent_site_leads AS lead
  WHERE lead.id = p_lead_id AND lead.source = 'seller_plan'
    AND EXISTS (
      SELECT 1 FROM public.site_config AS site
      WHERE site.agent_id = lead.agent_id AND site.owner_id = p_actor_id AND site.status = 'active'
    )
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Seller inquiry is unavailable to this site owner' USING ERRCODE = 'P0002';
  END IF;

  SELECT record.* INTO saved FROM public.seller_lead_publication_attributions AS record
  WHERE record.workspace_id = p_workspace_id AND record.request_key = p_request_key
  FOR UPDATE;
  IF FOUND THEN
    IF saved.publication_id <> p_publication_id OR saved.lead_id <> p_lead_id
      OR saved.evidence_note <> btrim(p_evidence_note) OR saved.entered_by <> p_actor_id THEN
      RAISE EXCEPTION 'Attribution idempotency key was reused with different content' USING ERRCODE = '23505';
    END IF;
    RETURN QUERY SELECT to_jsonb(saved), TRUE;
    RETURN;
  END IF;

  INSERT INTO public.seller_lead_publication_attributions AS target (
    workspace_id, publication_id, lead_id, evidence_note, request_key, entered_by
  ) VALUES (
    p_workspace_id, p_publication_id, p_lead_id, btrim(p_evidence_note), p_request_key, p_actor_id
  ) ON CONFLICT DO NOTHING RETURNING target.* INTO saved;
  IF NOT FOUND THEN
    SELECT record.* INTO saved FROM public.seller_lead_publication_attributions AS record
    WHERE record.workspace_id = p_workspace_id AND record.lead_id = p_lead_id
    FOR UPDATE;
    IF saved.id IS NULL OR saved.publication_id <> p_publication_id
      OR saved.evidence_note <> btrim(p_evidence_note) OR saved.entered_by <> p_actor_id THEN
      RAISE EXCEPTION 'Seller inquiry already has a different immutable attribution' USING ERRCODE = '23505';
    END IF;
    RETURN QUERY SELECT to_jsonb(saved), TRUE;
    RETURN;
  END IF;
  RETURN QUERY SELECT to_jsonb(saved), FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_record_seller_lead_publication_attribution(UUID,UUID,UUID,UUID,TEXT,UUID)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.platform_record_seller_lead_publication_attribution(UUID,UUID,UUID,UUID,TEXT,UUID)
  TO service_role;
