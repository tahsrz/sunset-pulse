-- Durable, idempotent delivery ledger for operational lead alerts.

CREATE TABLE IF NOT EXISTS public.notification_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_event_id UUID NOT NULL REFERENCES public.intelligence_events(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL,
    lead_id UUID REFERENCES public.agent_site_leads(id) ON DELETE SET NULL,
    listing_id TEXT,
    alert_kind TEXT NOT NULL CHECK (alert_kind IN ('high_intent_revisit', 'tour_request')),
    workflow_id TEXT NOT NULL,
    idempotency_key TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'suppressed')),
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    claimed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    provider_message_id TEXT,
    last_error TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notification_deliveries_ready_idx
ON public.notification_deliveries (status, next_attempt_at, created_at);

CREATE INDEX IF NOT EXISTS notification_deliveries_event_idx
ON public.notification_deliveries (source_event_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notification_deliveries_agent_idx
ON public.notification_deliveries (agent_id, created_at DESC);

DROP TRIGGER IF EXISTS set_notification_deliveries_updated_at ON public.notification_deliveries;
CREATE TRIGGER set_notification_deliveries_updated_at
BEFORE UPDATE ON public.notification_deliveries
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages notification deliveries" ON public.notification_deliveries;
CREATE POLICY "Service role manages notification deliveries"
ON public.notification_deliveries
TO service_role
USING (true)
WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.claim_notification_deliveries(p_limit INTEGER DEFAULT 20)
RETURNS SETOF public.notification_deliveries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH candidates AS (
        SELECT id
        FROM public.notification_deliveries
        WHERE (
            status IN ('pending', 'failed')
            OR (status = 'processing' AND claimed_at < now() - interval '10 minutes')
        )
          AND next_attempt_at <= now()
          AND attempt_count < 5
        ORDER BY next_attempt_at ASC, created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT LEAST(GREATEST(p_limit, 1), 100)
    )
    UPDATE public.notification_deliveries AS delivery
    SET status = 'processing',
        claimed_at = now(),
        attempt_count = delivery.attempt_count + 1,
        updated_at = now()
    FROM candidates
    WHERE delivery.id = candidates.id
    RETURNING delivery.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_notification_deliveries(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_notification_deliveries(INTEGER) TO service_role;
