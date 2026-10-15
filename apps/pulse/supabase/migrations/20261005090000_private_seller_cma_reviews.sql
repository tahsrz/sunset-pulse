-- Immutable, private human-authored CMA review revisions. This stores evidence
-- only; it does not calculate value, select comparables, or publish a CMA.

-- Server-side lead and tenant routes already use the service role and have
-- service-role RLS policies; fresh local rebuilds also need SQL table grants.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_config TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_site_leads TO service_role;
GRANT SELECT ON public.profiles TO authenticated;

-- Keep table policies from requiring a broad direct grant on tenant/lead data.
-- This SECURITY DEFINER predicate exposes only a boolean ownership decision.
CREATE OR REPLACE FUNCTION public.can_access_seller_cma_private_detail(
    p_lead_id UUID,
    p_agent_id TEXT,
    p_owner_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT p_owner_user_id = auth.uid()
       AND EXISTS (
            SELECT 1 FROM public.site_config AS site
            WHERE site.agent_id = p_agent_id
              AND site.owner_id = auth.uid()
       )
       AND EXISTS (
            SELECT 1 FROM public.agent_site_leads AS lead
            WHERE lead.id = p_lead_id
              AND lead.agent_id = p_agent_id
              AND lead.source = 'seller_plan'
              AND lead.metadata #>> '{sellerPlan,requestKind}' = 'pricing_review'
       )
       AND EXISTS (
            SELECT 1 FROM public.profiles AS profile
            WHERE profile.id = auth.uid()
              AND profile.role IN ('realtor', 'operator', 'admin')
       );
$$;

REVOKE ALL ON FUNCTION public.can_access_seller_cma_private_detail(UUID, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_seller_cma_private_detail(UUID, TEXT, UUID) TO authenticated;

DROP POLICY IF EXISTS seller_cma_private_details_owner_read ON public.seller_cma_private_details;
CREATE POLICY seller_cma_private_details_owner_read
ON public.seller_cma_private_details
FOR SELECT TO authenticated
USING (
    expires_at > now()
    AND public.can_access_seller_cma_private_detail(lead_id, agent_id, owner_user_id)
);

DROP POLICY IF EXISTS seller_cma_private_details_owner_delete ON public.seller_cma_private_details;
CREATE POLICY seller_cma_private_details_owner_delete
ON public.seller_cma_private_details
FOR DELETE TO authenticated
USING (public.can_access_seller_cma_private_detail(lead_id, agent_id, owner_user_id));

CREATE TABLE public.seller_cma_private_reviews (
    review_id UUID PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES public.agent_site_leads(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL REFERENCES public.site_config(agent_id) ON DELETE CASCADE,
    owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    revision INTEGER NOT NULL CHECK (revision > 0),
    supersedes_review_id UUID,
    status TEXT NOT NULL CHECK (status IN ('draft', 'reviewed')),
    review_data JSONB NOT NULL CHECK (jsonb_typeof(review_data) = 'object'),
    prepared_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL CHECK (expires_at > prepared_at),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT seller_cma_private_reviews_lead_revision_key UNIQUE (lead_id, revision),
    CONSTRAINT seller_cma_private_reviews_lead_id_key UNIQUE (lead_id, review_id),
    CONSTRAINT seller_cma_private_reviews_lineage_check CHECK (
        (revision = 1 AND supersedes_review_id IS NULL)
        OR (revision > 1 AND supersedes_review_id IS NOT NULL)
    ),
    CONSTRAINT seller_cma_private_reviews_prior_fk
        FOREIGN KEY (lead_id, supersedes_review_id)
        REFERENCES public.seller_cma_private_reviews(lead_id, review_id),
    CONSTRAINT seller_cma_private_reviews_envelope_check CHECK (
        review_data->>'schemaVersion' = '1'
        AND review_data->>'reviewId' = review_id::TEXT
        AND review_data->>'leadId' = lead_id::TEXT
        AND (review_data->>'revision')::INTEGER = revision
        AND review_data->>'status' = status
        AND review_data->>'useRestriction' = 'private-review-only'
        AND NULLIF(review_data->>'supersedesReviewId', 'null') IS NOT DISTINCT FROM supersedes_review_id::TEXT
    )
);

CREATE INDEX seller_cma_private_reviews_owner_lead_idx
    ON public.seller_cma_private_reviews (owner_user_id, lead_id, revision DESC);
CREATE INDEX seller_cma_private_reviews_expiry_idx
    ON public.seller_cma_private_reviews (expires_at);

CREATE OR REPLACE FUNCTION public.guard_seller_cma_private_review_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    detail_owner UUID;
    detail_agent TEXT;
    detail_expires_at TIMESTAMPTZ;
    prior_id UUID;
    prior_revision INTEGER;
BEGIN
    IF TG_OP <> 'INSERT' THEN
        RAISE EXCEPTION 'CMA review revisions are immutable' USING ERRCODE = '55000';
    END IF;

    -- Serialize revisions for one lead. The unique constraint remains the final
    -- guard if a transaction is interrupted or a key collision occurs.
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.lead_id::TEXT, 0));

    SELECT details.owner_user_id, details.agent_id, details.expires_at
      INTO detail_owner, detail_agent, detail_expires_at
      FROM public.seller_cma_private_details AS details
      JOIN public.agent_site_leads AS lead
        ON lead.id = details.lead_id
       AND lead.agent_id = details.agent_id
       AND lead.source = 'seller_plan'
       AND lead.metadata #>> '{sellerPlan,requestKind}' = 'pricing_review'
      JOIN public.site_config AS site
        ON site.agent_id = details.agent_id
       AND site.owner_id = details.owner_user_id
     WHERE details.lead_id = NEW.lead_id
       AND details.agent_id = NEW.agent_id
       AND details.owner_user_id = NEW.owner_user_id
       AND details.expires_at > now();

    IF detail_owner IS NULL OR detail_agent IS NULL OR detail_expires_at IS NULL THEN
        RAISE EXCEPTION 'CMA review requires current owner-authorized private details' USING ERRCODE = '42501';
    END IF;
    IF NEW.expires_at > detail_expires_at OR NEW.expires_at > NEW.prepared_at + INTERVAL '90 days' THEN
        RAISE EXCEPTION 'CMA review expiry exceeds the consent retention window' USING ERRCODE = '23514';
    END IF;

    SELECT review_id, revision
      INTO prior_id, prior_revision
      FROM public.seller_cma_private_reviews
     WHERE lead_id = NEW.lead_id
     ORDER BY revision DESC
     LIMIT 1;

    IF prior_revision IS NULL THEN
        IF NEW.revision <> 1 OR NEW.supersedes_review_id IS NOT NULL THEN
            RAISE EXCEPTION 'First CMA review revision must be 1 with no predecessor' USING ERRCODE = '23514';
        END IF;
    ELSIF NEW.revision <> prior_revision + 1 OR NEW.supersedes_review_id IS DISTINCT FROM prior_id THEN
        RAISE EXCEPTION 'CMA review revision must supersede the latest immutable revision' USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_seller_cma_private_review_insert() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER seller_cma_private_reviews_immutable
BEFORE INSERT OR UPDATE ON public.seller_cma_private_reviews
FOR EACH ROW EXECUTE FUNCTION public.guard_seller_cma_private_review_insert();

ALTER TABLE public.seller_cma_private_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.seller_cma_private_reviews FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.seller_cma_private_reviews TO authenticated;
GRANT ALL ON TABLE public.seller_cma_private_reviews TO service_role;

CREATE POLICY seller_cma_private_reviews_owner_read
ON public.seller_cma_private_reviews
FOR SELECT TO authenticated
USING (
    owner_user_id = auth.uid()
    AND expires_at > now()
);
