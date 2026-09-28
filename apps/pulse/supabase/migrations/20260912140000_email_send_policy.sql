ALTER TABLE public.licensed_workflow_settings
  ADD COLUMN IF NOT EXISTS audience_scope TEXT NOT NULL DEFAULT 'owned_hotlist_contacts'
    CHECK (audience_scope IN ('owned_hotlist_contacts')),
  ADD COLUMN IF NOT EXISTS auto_send_policy_version INTEGER NOT NULL DEFAULT 1 CHECK (auto_send_policy_version > 0);
