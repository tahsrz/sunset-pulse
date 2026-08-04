ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS next_action_type TEXT CHECK (next_action_type IS NULL OR next_action_type IN ('call', 'text', 'email', 'mailer', 'door_knock', 'follow_up')),
  ADD COLUMN IF NOT EXISTS next_action_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_action_note TEXT,
  ADD COLUMN IF NOT EXISTS do_not_contact BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contact_restriction_reason TEXT,
  ADD COLUMN IF NOT EXISTS contact_restriction_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS leads_daily_action_idx ON public.leads (next_action_due_at)
WHERE status IN ('new', 'contacted', 'nurture', 'appointment') AND do_not_contact = false;

ALTER TABLE public.lead_message_drafts
  ADD COLUMN IF NOT EXISTS fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by_name TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS lead_message_drafts_fingerprint_idx
  ON public.lead_message_drafts (fingerprint) WHERE fingerprint IS NOT NULL AND status <> 'archived';

CREATE TABLE IF NOT EXISTS public.lead_outreach_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  brokerage_name TEXT,
  phone TEXT,
  email TEXT,
  license_number TEXT,
  signature TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_lead_outreach_settings_updated_at ON public.lead_outreach_settings;
CREATE TRIGGER set_lead_outreach_settings_updated_at BEFORE UPDATE ON public.lead_outreach_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.lead_outreach_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Operators can manage their outreach settings" ON public.lead_outreach_settings;
CREATE POLICY "Operators can manage their outreach settings" ON public.lead_outreach_settings FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
