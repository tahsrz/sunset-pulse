-- First bounded autonomous workflow: MLS hot-list email to consented contacts.
-- Transactional/representation actions remain outside this table by design.

CREATE TABLE IF NOT EXISTS public.licensed_workflow_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL CHECK (char_length(agent_name) BETWEEN 1 AND 120),
  brokerage_name TEXT NOT NULL CHECK (char_length(brokerage_name) BETWEEN 1 AND 160),
  license_number TEXT NOT NULL CHECK (char_length(license_number) BETWEEN 1 AND 80),
  jurisdiction TEXT NOT NULL CHECK (char_length(jurisdiction) BETWEEN 2 AND 120),
  service_area TEXT NOT NULL CHECK (char_length(service_area) BETWEEN 2 AND 180),
  reply_to_email TEXT NOT NULL,
  disclosure_text TEXT NOT NULL CHECK (char_length(disclosure_text) BETWEEN 10 AND 1200),
  enabled BOOLEAN NOT NULL DEFAULT false,
  auto_send BOOLEAN NOT NULL DEFAULT false,
  max_recipients_per_run INTEGER NOT NULL DEFAULT 25 CHECK (max_recipients_per_run BETWEEN 1 AND 50),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.licensed_workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  workflow_key TEXT NOT NULL CHECK (workflow_key = 'hotlist_email'),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'sent', 'failed', 'cancelled')),
  idempotency_key TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  listing_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  recipient_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  skipped_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  approval_required BOOLEAN NOT NULL DEFAULT true,
  approved_at TIMESTAMPTZ,
  approved_by_name TEXT,
  sent_at TIMESTAMPTZ,
  provider_message_id TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS licensed_workflow_runs_user_created_idx
  ON public.licensed_workflow_runs(user_id, created_at DESC);

ALTER TABLE public.licensed_workflow_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licensed_workflow_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages licensed workflow settings" ON public.licensed_workflow_settings;
CREATE POLICY "Service role manages licensed workflow settings"
  ON public.licensed_workflow_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages licensed workflow runs" ON public.licensed_workflow_runs;
CREATE POLICY "Service role manages licensed workflow runs"
  ON public.licensed_workflow_runs FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS set_licensed_workflow_settings_updated_at ON public.licensed_workflow_settings;
CREATE TRIGGER set_licensed_workflow_settings_updated_at BEFORE UPDATE ON public.licensed_workflow_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_licensed_workflow_runs_updated_at ON public.licensed_workflow_runs;
CREATE TRIGGER set_licensed_workflow_runs_updated_at BEFORE UPDATE ON public.licensed_workflow_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
