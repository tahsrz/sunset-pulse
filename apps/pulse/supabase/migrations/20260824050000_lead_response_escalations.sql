-- Idempotent operator escalation ledger for delivered hot leads without contact receipts.

CREATE TABLE IF NOT EXISTS public.lead_response_escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id UUID NOT NULL REFERENCES public.notification_deliveries(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.agent_site_leads(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'suppressed', 'resolved')),
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    claimed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    last_error TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT lead_response_escalations_delivery_unique UNIQUE (delivery_id)
);

CREATE INDEX IF NOT EXISTS lead_response_escalations_ready_idx
ON public.lead_response_escalations (status, next_attempt_at, created_at);

DROP TRIGGER IF EXISTS set_lead_response_escalations_updated_at ON public.lead_response_escalations;
CREATE TRIGGER set_lead_response_escalations_updated_at
BEFORE UPDATE ON public.lead_response_escalations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.lead_response_escalations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages lead response escalations" ON public.lead_response_escalations;
CREATE POLICY "Service role manages lead response escalations"
ON public.lead_response_escalations TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.claim_lead_response_escalations(p_limit INTEGER DEFAULT 20)
RETURNS SETOF public.lead_response_escalations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH candidates AS (
        SELECT id FROM public.lead_response_escalations
        WHERE (status IN ('pending', 'failed') OR (status = 'processing' AND claimed_at < now() - interval '10 minutes'))
          AND next_attempt_at <= now() AND attempt_count < 5
        ORDER BY next_attempt_at ASC, created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT LEAST(GREATEST(p_limit, 1), 100)
    )
    UPDATE public.lead_response_escalations AS escalation
    SET status = 'processing', claimed_at = now(),
        attempt_count = escalation.attempt_count + 1, updated_at = now()
    FROM candidates WHERE escalation.id = candidates.id
    RETURNING escalation.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_lead_response_escalations(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_lead_response_escalations(INTEGER) TO service_role;
