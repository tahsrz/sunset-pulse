ALTER TABLE public.guided_buyer_requests
  ADD COLUMN pruned_at timestamptz,
  ALTER COLUMN name DROP NOT NULL,
  ALTER COLUMN email DROP NOT NULL,
  ALTER COLUMN journey DROP NOT NULL,
  ALTER COLUMN campaign DROP NOT NULL,
  ALTER COLUMN requested_contact_at DROP NOT NULL,
  ALTER COLUMN marketing_opt_in DROP NOT NULL,
  ADD CONSTRAINT guided_buyer_requests_retention_state CHECK (
    (pruned_at IS NULL AND name IS NOT NULL AND email IS NOT NULL AND journey IS NOT NULL
      AND campaign IS NOT NULL AND requested_contact_at IS NOT NULL AND marketing_opt_in IS NOT NULL)
    OR (pruned_at IS NOT NULL AND name IS NULL AND email IS NULL AND journey IS NULL
      AND campaign IS NULL AND requested_contact_at IS NULL AND marketing_opt_in IS NULL)
  );

CREATE INDEX guided_buyer_requests_retention_idx
  ON public.guided_buyer_requests (created_at, id) WHERE pruned_at IS NULL;

-- Keep replay identity after removing the contact, search, campaign and consent fields.
CREATE FUNCTION public.purge_expired_guided_buyer_requests()
RETURNS integer
LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$
  WITH expired AS (
    SELECT id FROM public.guided_buyer_requests
    WHERE pruned_at IS NULL AND created_at <= now() - interval '2160 hours'
    ORDER BY created_at, id
    LIMIT 500
    FOR UPDATE SKIP LOCKED
  ), pruned AS (
    UPDATE public.guided_buyer_requests AS buyer
    SET pruned_at = now(), name = NULL, email = NULL, journey = NULL, campaign = NULL,
        requested_contact_at = NULL, marketing_opt_in = NULL
    FROM expired
    WHERE buyer.id = expired.id
    RETURNING 1
  )
  SELECT count(*)::integer FROM pruned;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_guided_buyer_requests() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_guided_buyer_requests() TO service_role;

CREATE OR REPLACE FUNCTION public.save_guided_buyer_request(
  p_site text, p_agent_id text, p_submission_id uuid, p_fingerprint text,
  p_name text, p_email text, p_journey jsonb, p_campaign jsonb, p_marketing_opt_in boolean
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  configured_site public.site_config%ROWTYPE;
  existing record;
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

  SELECT assigned_owner_id, request_fingerprint, created_at, pruned_at INTO existing FROM public.guided_buyer_requests
  WHERE site_id = configured_site.id AND submission_id = p_submission_id;
  IF existing.assigned_owner_id = configured_site.owner_id AND existing.request_fingerprint = p_fingerprint THEN
    IF existing.pruned_at IS NOT NULL OR existing.created_at <= now() - interval '2160 hours' THEN
      RETURN 'expired';
    END IF;
    RETURN 'replayed';
  END IF;
  RETURN 'conflict';
END;
$$;

CREATE OR REPLACE FUNCTION public.list_owned_guided_buyer_requests(p_actor_id uuid, p_request_id uuid DEFAULT NULL)
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
    AND buyer.pruned_at IS NULL AND buyer.created_at > now() - interval '2160 hours'
    AND (p_request_id IS NULL OR buyer.id = p_request_id)
  ORDER BY buyer.created_at DESC, buyer.id DESC
  LIMIT 50;
$$;
