-- Buyer requests have their own read boundary. The general operator lead inbox
-- reads across sites and must not receive the buyer's contact or search answers.
CREATE TABLE public.guided_buyer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.site_config(id) ON DELETE CASCADE,
  assigned_owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL,
  request_fingerprint text NOT NULL CHECK (request_fingerprint ~ '^[a-f0-9]{64}$'),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 180),
  journey jsonb NOT NULL CHECK (jsonb_typeof(journey) = 'object' AND octet_length(journey::text) <= 2048),
  campaign jsonb NOT NULL CHECK (jsonb_typeof(campaign) = 'object' AND octet_length(campaign::text) <= 2048),
  requested_contact_at timestamptz NOT NULL DEFAULT now(),
  marketing_opt_in boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, submission_id)
);

CREATE INDEX guided_buyer_requests_owner_created_idx
  ON public.guided_buyer_requests (assigned_owner_id, created_at DESC, id DESC);
ALTER TABLE public.guided_buyer_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.guided_buyer_requests FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.save_guided_buyer_request(
  p_site text, p_agent_id text, p_submission_id uuid, p_fingerprint text,
  p_name text, p_email text, p_journey jsonb, p_campaign jsonb, p_marketing_opt_in boolean
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  configured_site public.site_config%ROWTYPE;
  existing public.guided_buyer_requests%ROWTYPE;
BEGIN
  SELECT * INTO configured_site FROM public.site_config
  WHERE lower(subdomain) = p_site AND agent_id = p_agent_id AND status = 'active' AND owner_id IS NOT NULL
  FOR SHARE;
  IF NOT FOUND THEN RETURN 'configuration'; END IF;

  INSERT INTO public.guided_buyer_requests (
    site_id, assigned_owner_id, submission_id, request_fingerprint, name, email, journey, campaign, marketing_opt_in
  ) VALUES (
    configured_site.id, configured_site.owner_id, p_submission_id, p_fingerprint,
    p_name, p_email, p_journey, p_campaign, p_marketing_opt_in
  ) ON CONFLICT (site_id, submission_id) DO NOTHING;
  IF FOUND THEN RETURN 'saved'; END IF;

  SELECT * INTO existing FROM public.guided_buyer_requests
  WHERE site_id = configured_site.id AND submission_id = p_submission_id;
  IF existing.assigned_owner_id = configured_site.owner_id AND existing.request_fingerprint = p_fingerprint THEN
    RETURN 'replayed';
  END IF;
  RETURN 'conflict';
END;
$$;

CREATE FUNCTION public.list_owned_guided_buyer_requests(p_actor_id uuid, p_request_id uuid DEFAULT NULL)
RETURNS SETOF jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'id', buyer.id, 'site', site.subdomain, 'createdAt', buyer.created_at,
    'name', buyer.name, 'email', buyer.email, 'journey', buyer.journey,
    'requestedContactAt', buyer.requested_contact_at, 'marketingOptIn', buyer.marketing_opt_in
  )
  FROM public.guided_buyer_requests AS buyer
  JOIN public.site_config AS site ON site.id = buyer.site_id
  WHERE buyer.assigned_owner_id = p_actor_id AND site.owner_id = p_actor_id AND site.status = 'active' AND site.subdomain IS NOT NULL
    AND (p_request_id IS NULL OR buyer.id = p_request_id)
  ORDER BY buyer.created_at DESC, buyer.id DESC
  LIMIT 50;
$$;

REVOKE ALL ON FUNCTION public.save_guided_buyer_request(text,text,uuid,text,text,text,jsonb,jsonb,boolean),
  public.list_owned_guided_buyer_requests(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_guided_buyer_request(text,text,uuid,text,text,text,jsonb,jsonb,boolean),
  public.list_owned_guided_buyer_requests(uuid,uuid) TO service_role;
