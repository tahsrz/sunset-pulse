-- Provider and point-in-time cost receipt for external agent notifications.

ALTER TABLE public.notification_deliveries
    ADD COLUMN IF NOT EXISTS provider TEXT,
    ADD COLUMN IF NOT EXISTS cost_usd NUMERIC(12, 6);

ALTER TABLE public.notification_deliveries
    DROP CONSTRAINT IF EXISTS notification_deliveries_provider_check,
    ADD CONSTRAINT notification_deliveries_provider_check
        CHECK (provider IS NULL OR provider IN ('resend', 'telnyx')),
    DROP CONSTRAINT IF EXISTS notification_deliveries_cost_usd_check,
    ADD CONSTRAINT notification_deliveries_cost_usd_check
        CHECK (cost_usd IS NULL OR cost_usd >= 0);

CREATE INDEX IF NOT EXISTS notification_deliveries_provider_created_idx
ON public.notification_deliveries (provider, created_at DESC)
WHERE provider IS NOT NULL;
