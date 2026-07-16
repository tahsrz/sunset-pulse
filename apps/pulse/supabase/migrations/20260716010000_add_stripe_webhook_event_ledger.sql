-- Persist Stripe webhook event IDs so signed replay deliveries are processed once.

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    object_id TEXT,
    livemode BOOLEAN DEFAULT false,
    status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'succeeded', 'failed')),
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stripe_webhook_events_type_idx
ON public.stripe_webhook_events (event_type);

CREATE INDEX IF NOT EXISTS stripe_webhook_events_status_idx
ON public.stripe_webhook_events (status);

DROP TRIGGER IF EXISTS set_stripe_webhook_events_updated_at ON public.stripe_webhook_events;
CREATE TRIGGER set_stripe_webhook_events_updated_at
BEFORE UPDATE ON public.stripe_webhook_events
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage stripe webhook events" ON public.stripe_webhook_events;
CREATE POLICY "Service role can manage stripe webhook events"
ON public.stripe_webhook_events
TO service_role
USING (true)
WITH CHECK (true);
