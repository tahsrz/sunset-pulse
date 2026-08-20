ALTER TABLE public.agent_site_leads
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS agent_site_leads_idempotency_key_idx
ON public.agent_site_leads (idempotency_key)
WHERE idempotency_key IS NOT NULL;
