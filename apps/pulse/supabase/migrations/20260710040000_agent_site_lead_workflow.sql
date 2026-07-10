-- Workflow fields for public SaaS agent-site lead inbox.
-- Keeps capture append-only while letting operators review, note, restore, and archive inquiries.

ALTER TABLE public.agent_site_leads
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new',
ADD COLUMN IF NOT EXISTS internal_note TEXT,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agent_site_leads_status_check'
  ) THEN
    ALTER TABLE public.agent_site_leads
    ADD CONSTRAINT agent_site_leads_status_check
    CHECK (status IN ('new', 'reviewed', 'archived'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS agent_site_leads_status_created_idx
ON public.agent_site_leads (status, created_at DESC);
