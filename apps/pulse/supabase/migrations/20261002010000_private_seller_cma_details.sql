-- Property-specific seller details are kept out of the broadly role-readable lead inbox.
-- A CMA address is readable only by the authenticated owner of its agent site and
-- automatically becomes inaccessible 90 days after capture before daily purging.

CREATE TABLE IF NOT EXISTS public.seller_cma_private_details (
    lead_id UUID PRIMARY KEY REFERENCES public.agent_site_leads(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL REFERENCES public.site_config(agent_id) ON DELETE CASCADE,
    owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    property_address TEXT NOT NULL,
    seller_permission_confirmed BOOLEAN NOT NULL CHECK (seller_permission_confirmed IS TRUE),
    consent_text_version TEXT NOT NULL CHECK (consent_text_version = 'cma-address-consent.v1'),
    consent_captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '90 days'),
    CONSTRAINT seller_cma_private_details_address_length CHECK (char_length(btrim(property_address)) BETWEEN 6 AND 240)
);

CREATE OR REPLACE FUNCTION public.set_seller_cma_private_details_expiry()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.expires_at := NEW.created_at + INTERVAL '90 days';
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_seller_cma_private_details_expiry() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS seller_cma_private_details_set_expiry ON public.seller_cma_private_details;
CREATE TRIGGER seller_cma_private_details_set_expiry
BEFORE INSERT OR UPDATE ON public.seller_cma_private_details
FOR EACH ROW EXECUTE FUNCTION public.set_seller_cma_private_details_expiry();

CREATE INDEX IF NOT EXISTS seller_cma_private_details_expiry_idx
ON public.seller_cma_private_details (expires_at);

ALTER TABLE public.seller_cma_private_details ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.seller_cma_private_details FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON TABLE public.seller_cma_private_details TO authenticated;
GRANT ALL ON TABLE public.seller_cma_private_details TO service_role;

DROP POLICY IF EXISTS seller_cma_private_details_owner_read ON public.seller_cma_private_details;
CREATE POLICY seller_cma_private_details_owner_read
ON public.seller_cma_private_details
FOR SELECT TO authenticated
USING (
    owner_user_id = auth.uid()
    AND expires_at > now()
    AND EXISTS (
        SELECT 1 FROM public.site_config AS site
        WHERE site.agent_id = seller_cma_private_details.agent_id
          AND site.owner_id = auth.uid()
    )
    AND EXISTS (
        SELECT 1 FROM public.agent_site_leads AS lead
        WHERE lead.id = seller_cma_private_details.lead_id
          AND lead.agent_id = seller_cma_private_details.agent_id
          AND lead.source = 'seller_plan'
          AND lead.metadata #>> '{sellerPlan,requestKind}' = 'pricing_review'
    )
    AND EXISTS (
        SELECT 1 FROM public.profiles AS profile
        WHERE profile.id = auth.uid()
          AND profile.role IN ('realtor', 'operator', 'admin')
    )
);

DROP POLICY IF EXISTS seller_cma_private_details_owner_delete ON public.seller_cma_private_details;
CREATE POLICY seller_cma_private_details_owner_delete
ON public.seller_cma_private_details
FOR DELETE TO authenticated
USING (
    owner_user_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.site_config AS site
        WHERE site.agent_id = seller_cma_private_details.agent_id
          AND site.owner_id = auth.uid()
    )
    AND EXISTS (
        SELECT 1 FROM public.agent_site_leads AS lead
        WHERE lead.id = seller_cma_private_details.lead_id
          AND lead.agent_id = seller_cma_private_details.agent_id
          AND lead.source = 'seller_plan'
          AND lead.metadata #>> '{sellerPlan,requestKind}' = 'pricing_review'
    )
    AND EXISTS (
        SELECT 1 FROM public.profiles AS profile
        WHERE profile.id = auth.uid()
          AND profile.role IN ('realtor', 'operator', 'admin')
    )
);

DROP POLICY IF EXISTS seller_cma_private_details_service_all ON public.seller_cma_private_details;
CREATE POLICY seller_cma_private_details_service_all
ON public.seller_cma_private_details
FOR ALL TO service_role
USING (true)
WITH CHECK (true);
