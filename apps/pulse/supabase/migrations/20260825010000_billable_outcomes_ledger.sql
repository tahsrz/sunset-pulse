-- LUNA-102: append-only outcome ledger for shadow billing and future metering.

CREATE TABLE IF NOT EXISTS public.billable_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    tenant_site TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    funnel_id UUID NOT NULL,
    lead_id UUID NOT NULL REFERENCES public.agent_site_leads(id) ON DELETE RESTRICT,
    booking_id UUID REFERENCES public.scheduling_bookings(id) ON DELETE RESTRICT,
    outcome_type TEXT NOT NULL CHECK (outcome_type IN (
        'qualified_handoff',
        'property_specific_handoff',
        'buyer_consultation_booked',
        'property_tour_booked',
        'seller_consultation_booked'
    )),
    outcome_version INTEGER NOT NULL DEFAULT 1 CHECK (outcome_version > 0),
    entry_kind TEXT NOT NULL CHECK (entry_kind IN ('charge', 'credit', 'reversal')),
    amount_usd NUMERIC(12, 2) NOT NULL CHECK (amount_usd >= 0),
    currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency = 'USD'),
    occurred_at TIMESTAMPTZ NOT NULL,
    attribution_window_days INTEGER NOT NULL DEFAULT 30 CHECK (attribution_window_days > 0),
    evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    idempotency_key TEXT NOT NULL UNIQUE,
    supersedes_outcome_id UUID REFERENCES public.billable_outcomes(id) ON DELETE RESTRICT,
    billing_status TEXT NOT NULL DEFAULT 'shadow' CHECK (billing_status IN ('shadow', 'pending', 'billable', 'submitted', 'invoiced', 'voided', 'disputed')),
    stripe_meter_event_id TEXT,
    status_reason TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS billable_outcomes_funnel_occurred_idx
ON public.billable_outcomes (funnel_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS billable_outcomes_tenant_status_idx
ON public.billable_outcomes (tenant_site, billing_status, occurred_at DESC);

CREATE INDEX IF NOT EXISTS billable_outcomes_lead_idx
ON public.billable_outcomes (lead_id, occurred_at DESC);

ALTER TABLE public.billable_outcomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage billable outcomes" ON public.billable_outcomes;
CREATE POLICY "Service role can manage billable outcomes"
ON public.billable_outcomes
TO service_role
USING (true)
WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.prevent_billable_outcome_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'billable outcomes are append-only; use a reversal entry';
    END IF;

    IF NEW.tenant_site IS DISTINCT FROM OLD.tenant_site
       OR NEW.agent_id IS DISTINCT FROM OLD.agent_id
       OR NEW.funnel_id IS DISTINCT FROM OLD.funnel_id
       OR NEW.lead_id IS DISTINCT FROM OLD.lead_id
       OR NEW.booking_id IS DISTINCT FROM OLD.booking_id
       OR NEW.outcome_type IS DISTINCT FROM OLD.outcome_type
       OR NEW.outcome_version IS DISTINCT FROM OLD.outcome_version
       OR NEW.entry_kind IS DISTINCT FROM OLD.entry_kind
       OR NEW.amount_usd IS DISTINCT FROM OLD.amount_usd
       OR NEW.currency IS DISTINCT FROM OLD.currency
       OR NEW.occurred_at IS DISTINCT FROM OLD.occurred_at
       OR NEW.attribution_window_days IS DISTINCT FROM OLD.attribution_window_days
       OR NEW.evidence IS DISTINCT FROM OLD.evidence
       OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
       OR NEW.supersedes_outcome_id IS DISTINCT FROM OLD.supersedes_outcome_id THEN
        RAISE EXCEPTION 'billable outcome identity and evidence are immutable';
    END IF;

    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_billable_outcomes ON public.billable_outcomes;
CREATE TRIGGER protect_billable_outcomes
BEFORE UPDATE OR DELETE ON public.billable_outcomes
FOR EACH ROW EXECUTE FUNCTION public.prevent_billable_outcome_mutation();
