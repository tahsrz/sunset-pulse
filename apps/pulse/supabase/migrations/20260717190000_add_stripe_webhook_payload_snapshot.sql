-- Store a buyer-safe summary of Stripe webhook payloads for operator reconciliation.

ALTER TABLE public.stripe_webhook_events
ADD COLUMN IF NOT EXISTS payload_snapshot JSONB;

CREATE INDEX IF NOT EXISTS stripe_webhook_events_payload_snapshot_object_idx
ON public.stripe_webhook_events ((payload_snapshot->>'objectId'));

CREATE INDEX IF NOT EXISTS stripe_webhook_events_payload_snapshot_subscription_idx
ON public.stripe_webhook_events ((payload_snapshot->>'subscriptionId'));
