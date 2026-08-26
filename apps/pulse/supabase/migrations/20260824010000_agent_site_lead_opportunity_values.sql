-- Authoritative opportunity values for profit reporting.

ALTER TABLE public.agent_site_leads
    ADD COLUMN IF NOT EXISTS estimated_pipeline_value NUMERIC(14, 2),
    ADD COLUMN IF NOT EXISTS closed_revenue NUMERIC(14, 2),
    ADD COLUMN IF NOT EXISTS value_currency TEXT,
    ADD COLUMN IF NOT EXISTS value_source TEXT,
    ADD COLUMN IF NOT EXISTS valued_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS valued_by TEXT;

ALTER TABLE public.agent_site_leads
    DROP CONSTRAINT IF EXISTS agent_site_leads_estimated_pipeline_value_check,
    ADD CONSTRAINT agent_site_leads_estimated_pipeline_value_check
        CHECK (estimated_pipeline_value IS NULL OR estimated_pipeline_value >= 0),
    DROP CONSTRAINT IF EXISTS agent_site_leads_closed_revenue_check,
    ADD CONSTRAINT agent_site_leads_closed_revenue_check
        CHECK (closed_revenue IS NULL OR closed_revenue >= 0),
    DROP CONSTRAINT IF EXISTS agent_site_leads_value_currency_check,
    ADD CONSTRAINT agent_site_leads_value_currency_check
        CHECK (value_currency IS NULL OR value_currency = 'USD'),
    DROP CONSTRAINT IF EXISTS agent_site_leads_value_source_check,
    ADD CONSTRAINT agent_site_leads_value_source_check
        CHECK (value_source IS NULL OR value_source IN ('operator_estimate', 'crm', 'closing_statement'));

CREATE INDEX IF NOT EXISTS agent_site_leads_value_source_idx
ON public.agent_site_leads (value_source, valued_at DESC)
WHERE value_source IS NOT NULL;
