-- Count signed Stripe replay deliveries that were safely ignored by the ledger.

ALTER TABLE public.stripe_webhook_events
ADD COLUMN IF NOT EXISTS duplicate_count INTEGER NOT NULL DEFAULT 0;
