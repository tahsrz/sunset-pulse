-- Authoritative engagement receipts. Pipeline status alone is not proof of contact or response.

ALTER TABLE public.agent_site_leads
ADD COLUMN IF NOT EXISTS contact_attempted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS contact_channel TEXT CHECK (contact_channel IN ('call', 'email', 'sms')),
ADD COLUMN IF NOT EXISTS contact_recorded_by TEXT,
ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS response_source TEXT CHECK (response_source IN ('customer_reply', 'appointment_booked')),
ADD COLUMN IF NOT EXISTS response_recorded_by TEXT;

CREATE INDEX IF NOT EXISTS agent_site_leads_contact_attempted_idx
ON public.agent_site_leads (contact_attempted_at DESC)
WHERE contact_attempted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS agent_site_leads_responded_idx
ON public.agent_site_leads (responded_at DESC)
WHERE responded_at IS NOT NULL;
