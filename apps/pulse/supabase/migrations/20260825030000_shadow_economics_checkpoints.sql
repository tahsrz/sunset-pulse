-- LUNA-403: durable daily shadow economics observations.

CREATE TABLE IF NOT EXISTS public.shadow_economics_checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_site TEXT NOT NULL,
    checkpoint_date DATE NOT NULL,
    margin_percent NUMERIC(8, 3),
    duplicate_rate_percent NUMERIC(8, 3),
    dispute_rate_percent NUMERIC(8, 3),
    pipeline_multiple NUMERIC(12, 3),
    handoff_conversion_delta_percent NUMERIC(8, 3),
    appointment_conversion_delta_percent NUMERIC(8, 3),
    evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_site, checkpoint_date)
);

ALTER TABLE public.shadow_economics_checkpoints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role can manage shadow checkpoints" ON public.shadow_economics_checkpoints;
CREATE POLICY "Service role can manage shadow checkpoints" ON public.shadow_economics_checkpoints TO service_role USING (true) WITH CHECK (true);
