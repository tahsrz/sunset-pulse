-- LUNA-103: append-only internal cost ledger.

CREATE TABLE IF NOT EXISTS public.internal_cost_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    tenant_site TEXT NOT NULL,
    funnel_id UUID,
    lead_id UUID REFERENCES public.agent_site_leads(id) ON DELETE RESTRICT,
    cost_type TEXT NOT NULL CHECK (cost_type IN ('model', 'search_tool', 'email_sms', 'signing', 'crawling', 'infrastructure')),
    amount_usd NUMERIC(12, 6),
    currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency = 'USD'),
    occurred_at TIMESTAMPTZ NOT NULL,
    source TEXT NOT NULL,
    evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    idempotency_key TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'recorded' CHECK (status IN ('recorded', 'reversed')),
    reversal_reason TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (amount_usd IS NULL OR amount_usd >= 0)
);

CREATE INDEX IF NOT EXISTS internal_cost_entries_tenant_occurred_idx
ON public.internal_cost_entries (tenant_site, occurred_at DESC);

CREATE INDEX IF NOT EXISTS internal_cost_entries_funnel_idx
ON public.internal_cost_entries (funnel_id, occurred_at DESC);

ALTER TABLE public.internal_cost_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage internal costs" ON public.internal_cost_entries;
CREATE POLICY "Service role can manage internal costs"
ON public.internal_cost_entries TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.prevent_internal_cost_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'internal cost entries are append-only; use a reversal entry';
    END IF;
    IF NEW.tenant_site IS DISTINCT FROM OLD.tenant_site
       OR NEW.funnel_id IS DISTINCT FROM OLD.funnel_id
       OR NEW.lead_id IS DISTINCT FROM OLD.lead_id
       OR NEW.cost_type IS DISTINCT FROM OLD.cost_type
       OR NEW.amount_usd IS DISTINCT FROM OLD.amount_usd
       OR NEW.currency IS DISTINCT FROM OLD.currency
       OR NEW.occurred_at IS DISTINCT FROM OLD.occurred_at
       OR NEW.source IS DISTINCT FROM OLD.source
       OR NEW.evidence IS DISTINCT FROM OLD.evidence
       OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key THEN
        RAISE EXCEPTION 'internal cost identity and evidence are immutable';
    END IF;
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_internal_cost_entries ON public.internal_cost_entries;
CREATE TRIGGER protect_internal_cost_entries
BEFORE UPDATE OR DELETE ON public.internal_cost_entries
FOR EACH ROW EXECUTE FUNCTION public.prevent_internal_cost_mutation();
