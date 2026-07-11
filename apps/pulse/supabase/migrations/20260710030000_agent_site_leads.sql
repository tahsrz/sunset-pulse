-- Public SaaS agent-site lead submissions.
-- Stores every inquiry event separately so one buyer can ask about multiple homes
-- without colliding with the legacy leads.email UNIQUE pipeline.

CREATE TABLE IF NOT EXISTS public.agent_site_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    agent_id TEXT NOT NULL,
    site TEXT NOT NULL,
    site_name TEXT,
    listing_id TEXT,
    listing_mls_id TEXT,
    listing_name TEXT,
    source TEXT DEFAULT 'agent_site',
    page_path TEXT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    preferred_contact TEXT DEFAULT 'either' CHECK (preferred_contact IN ('email', 'phone', 'either')),
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS agent_site_leads_agent_created_idx
ON public.agent_site_leads (agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS agent_site_leads_listing_mls_idx
ON public.agent_site_leads (listing_mls_id)
WHERE listing_mls_id IS NOT NULL;

ALTER TABLE public.agent_site_leads ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_agent_site_leads_updated_at ON public.agent_site_leads;
CREATE TRIGGER set_agent_site_leads_updated_at
BEFORE UPDATE ON public.agent_site_leads
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS "Operators can read agent site leads" ON public.agent_site_leads;
CREATE POLICY "Operators can read agent site leads"
ON public.agent_site_leads
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('realtor', 'operator', 'admin')
    )
);

DROP POLICY IF EXISTS "Service role can manage agent site leads" ON public.agent_site_leads;
CREATE POLICY "Service role can manage agent site leads"
ON public.agent_site_leads
TO service_role
USING (true)
WITH CHECK (true);
