CREATE TABLE public.seller_property_profiles (
  lead_id uuid PRIMARY KEY REFERENCES public.seller_cases(lead_id) ON DELETE CASCADE,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  draft jsonb NOT NULL CHECK (jsonb_typeof(draft) = 'object' AND octet_length(draft::text) <= 65536),
  published jsonb CHECK (jsonb_typeof(published) = 'object' AND octet_length(published::text) <= 65536),
  share_token uuid UNIQUE,
  CHECK ((published IS NULL) = (share_token IS NULL))
);
ALTER TABLE public.seller_property_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.seller_property_profiles FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.seller_property_profile(p_actor_id uuid, p_lead_id uuid, p_input jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  saved public.seller_property_profiles%ROWTYPE;
  lead public.agent_site_leads%ROWTYPE;
  action text := p_input->>'action';
  snapshot jsonb;
BEGIN
  lead := public.seller_service_require_owner(p_actor_id, p_lead_id, p_input IS NOT NULL);
  SELECT * INTO saved FROM public.seller_property_profiles WHERE lead_id = p_lead_id;
  IF p_input IS NOT NULL THEN
    IF action IS NULL OR action NOT IN ('save', 'publish', 'revoke') OR octet_length(p_input::text) > 66000 THEN
      RAISE EXCEPTION 'Invalid property profile action' USING ERRCODE = '22023';
    END IF;
    IF lead.status = 'archived' AND action <> 'revoke' THEN
      RAISE EXCEPTION 'Seller request unavailable' USING ERRCODE = 'P0002';
    END IF;
    IF (p_input->>'expectedRevision')::integer IS DISTINCT FROM coalesce(saved.revision, 0) THEN
      RAISE EXCEPTION 'Property profile changed' USING ERRCODE = '40001';
    END IF;
    IF action = 'save' THEN
      IF saved.lead_id IS NULL THEN
        INSERT INTO public.seller_cases(lead_id, owner_id) VALUES (p_lead_id, p_actor_id) ON CONFLICT DO NOTHING;
        INSERT INTO public.seller_property_profiles(lead_id, draft) VALUES (p_lead_id, p_input->'draft') RETURNING * INTO saved;
      ELSE
        UPDATE public.seller_property_profiles SET draft = p_input->'draft', revision = revision + 1
        WHERE lead_id = p_lead_id RETURNING * INTO saved;
      END IF;
    ELSIF saved.lead_id IS NULL THEN
      RAISE EXCEPTION 'Save a property profile first' USING ERRCODE = 'P0002';
    ELSIF action = 'publish' THEN
      snapshot := saved.draft;
      IF p_input->'includeMap' IS DISTINCT FROM 'true'::jsonb THEN
        snapshot := jsonb_set(snapshot - 'driveway', '{buildings}', (SELECT coalesce(jsonb_agg(item - 'pin' ORDER BY position), '[]')
          FROM jsonb_array_elements(snapshot->'buildings') WITH ORDINALITY AS buildings(item, position)));
      END IF;
      UPDATE public.seller_property_profiles SET published = snapshot,
        share_token = coalesce(share_token, gen_random_uuid()), revision = revision + 1
      WHERE lead_id = p_lead_id RETURNING * INTO saved;
    ELSIF saved.share_token IS NOT NULL THEN
      UPDATE public.seller_property_profiles SET published = NULL, share_token = NULL, revision = revision + 1
      WHERE lead_id = p_lead_id RETURNING * INTO saved;
    END IF;
  END IF;
  IF saved.lead_id IS NULL THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('revision', saved.revision, 'draft', saved.draft,
    'published', saved.published, 'shareToken', saved.share_token);
END;
$$;

CREATE FUNCTION public.read_shared_property_profile(p_token uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT profile.published FROM public.seller_property_profiles AS profile
  JOIN public.seller_cases AS seller ON seller.lead_id = profile.lead_id
  JOIN public.agent_site_leads AS lead ON lead.id = seller.lead_id
  WHERE profile.share_token = p_token AND lead.source = 'seller_plan' AND lead.status IS DISTINCT FROM 'archived'
    AND EXISTS (SELECT 1 FROM public.site_config AS site
      WHERE site.agent_id = lead.agent_id AND site.owner_id = seller.owner_id AND site.status = 'active');
$$;

REVOKE ALL ON FUNCTION public.seller_property_profile(uuid, uuid, jsonb), public.read_shared_property_profile(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.seller_property_profile(uuid, uuid, jsonb), public.read_shared_property_profile(uuid) TO service_role;
