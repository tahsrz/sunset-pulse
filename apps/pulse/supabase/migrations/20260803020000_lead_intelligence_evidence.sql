-- Lead-bound Crawl4AI evidence. Crawled facts remain reviewable and never
-- overwrite a lead until an operator explicitly accepts individual fields.

CREATE TABLE IF NOT EXISTS public.lead_intel_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name TEXT,
  source_url TEXT NOT NULL,
  source_host TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('brokerage', 'regional_site', 'tax_record', 'business_profile', 'other')),
  crawl_record_id TEXT NOT NULL UNIQUE,
  crawl_status TEXT NOT NULL CHECK (crawl_status IN ('completed', 'unavailable', 'blocked', 'failed')),
  captured_at TIMESTAMPTZ NOT NULL,
  title TEXT,
  description TEXT,
  content_sha256 TEXT NOT NULL,
  extracted_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  markdown_excerpt TEXT,
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'applied', 'dismissed')),
  accepted_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by_name TEXT
);

CREATE INDEX IF NOT EXISTS lead_intel_evidence_lead_created_idx
  ON public.lead_intel_evidence (lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS lead_intel_evidence_pending_idx
  ON public.lead_intel_evidence (review_status, created_at DESC)
  WHERE review_status = 'pending';

ALTER TABLE public.lead_intel_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Operators can manage lead intelligence evidence" ON public.lead_intel_evidence;
CREATE POLICY "Operators can manage lead intelligence evidence"
ON public.lead_intel_evidence
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('realtor', 'operator', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('realtor', 'operator', 'admin')
  )
);

CREATE OR REPLACE FUNCTION public.apply_lead_intel_evidence_fields(
  p_lead_id UUID,
  p_evidence_id UUID,
  p_updates JSONB,
  p_reviewer UUID DEFAULT NULL,
  p_reviewer_name TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invalid_key TEXT;
BEGIN
  IF jsonb_typeof(p_updates) <> 'object' OR p_updates = '{}'::jsonb THEN
    RAISE EXCEPTION 'At least one accepted field is required.';
  END IF;

  SELECT field_name INTO invalid_key
  FROM jsonb_object_keys(p_updates) AS update_keys(field_name)
  WHERE field_name NOT IN ('name', 'first_name', 'last_name', 'phone', 'email', 'property_address', 'mailing_address')
  LIMIT 1;

  IF invalid_key IS NOT NULL THEN
    RAISE EXCEPTION 'Unsupported lead field: %', invalid_key;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.lead_intel_evidence
    WHERE id = p_evidence_id
      AND lead_id = p_lead_id
      AND review_status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Pending evidence record was not found for this lead.';
  END IF;

  UPDATE public.leads
  SET
    name = CASE WHEN p_updates ? 'name' THEN p_updates->>'name' ELSE name END,
    first_name = CASE WHEN p_updates ? 'first_name' THEN p_updates->>'first_name' ELSE first_name END,
    last_name = CASE WHEN p_updates ? 'last_name' THEN p_updates->>'last_name' ELSE last_name END,
    phone = CASE WHEN p_updates ? 'phone' THEN p_updates->>'phone' ELSE phone END,
    email = CASE WHEN p_updates ? 'email' THEN p_updates->>'email' ELSE email END,
    property_address = CASE WHEN p_updates ? 'property_address' THEN p_updates->>'property_address' ELSE property_address END,
    mailing_address = CASE WHEN p_updates ? 'mailing_address' THEN p_updates->>'mailing_address' ELSE mailing_address END
  WHERE id = p_lead_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead was not found.';
  END IF;

  UPDATE public.lead_intel_evidence
  SET
    review_status = 'applied',
    accepted_fields = accepted_fields || p_updates,
    reviewed_at = now(),
    reviewed_by = p_reviewer,
    reviewed_by_name = p_reviewer_name
  WHERE id = p_evidence_id;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_lead_intel_evidence_fields(UUID, UUID, JSONB, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_lead_intel_evidence_fields(UUID, UUID, JSONB, UUID, TEXT) TO service_role;
