-- Site billing and operator-review metadata for paid agent-site provisioning.

ALTER TABLE public.site_config ADD COLUMN IF NOT EXISTS billing_profile JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.site_config ADD COLUMN IF NOT EXISTS review_profile JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS site_config_billing_user_idx
ON public.site_config ((billing_profile->>'userId'));

CREATE INDEX IF NOT EXISTS site_config_stripe_customer_idx
ON public.site_config ((billing_profile->>'stripeCustomerId'));

CREATE INDEX IF NOT EXISTS site_config_review_status_idx
ON public.site_config ((review_profile->>'status'));
