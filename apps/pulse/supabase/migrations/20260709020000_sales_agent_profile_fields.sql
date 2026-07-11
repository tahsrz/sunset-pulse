-- Sales-agent profile fields for swappable Sunset Pulse instances.
--
-- Keep public theme data in branding/hero, but give every site_config row a
-- typed place for agent-facing identity, assistant naming, compliance, and
-- integrations. These JSONB fields let the product become reusable for other
-- sales agents without needing a new table before the shape settles.

ALTER TABLE public.site_config
ADD COLUMN IF NOT EXISTS agent_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS assistant_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS compliance_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS integration_profile JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.site_config.agent_profile IS
'Public sales-agent identity: name, brokerage, license, phone, email, markets, headshot, and office data.';

COMMENT ON COLUMN public.site_config.assistant_profile IS
'Public AI assistant identity: display name, tone, disclaimers, handoff behavior, and prompt overrides.';

COMMENT ON COLUMN public.site_config.compliance_profile IS
'Jurisdiction and brokerage compliance settings such as TREC links, equal-housing flags, MLS disclaimers, and footer copy.';

COMMENT ON COLUMN public.site_config.integration_profile IS
'Per-agent integration handles and feature toggles such as MLS provider, calendar routing, CRM tags, and lead sinks.';

