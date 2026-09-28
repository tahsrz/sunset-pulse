-- OP02: explicit, replayable links from legacy owner-scoped records to a workspace.
-- This table records unresolved/ambiguous candidates as well as mapped records;
-- it never changes legacy owner_id authorization or grants team access by itself.

CREATE TABLE IF NOT EXISTS public.platform_scope_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type TEXT NOT NULL CHECK (resource_type IN (
    'profile',
    'site_config',
    'property_shortlist',
    'sprint',
    'assignment',
    'licensed_workflow_run',
    'vibe_revision',
    'scan'
  )),
  resource_id TEXT NOT NULL CHECK (char_length(btrim(resource_id)) BETWEEN 1 AND 240),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.platform_workspaces(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('mapped', 'unmapped', 'ambiguous')),
  reason TEXT CHECK (reason IS NULL OR char_length(reason) BETWEEN 1 AND 500),
  source_revision BIGINT,
  source_fingerprint TEXT CHECK (source_fingerprint IS NULL OR char_length(source_fingerprint) BETWEEN 1 AND 128),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (resource_type, resource_id),
  CHECK ((status = 'mapped' AND workspace_id IS NOT NULL) OR status <> 'mapped')
);

CREATE INDEX IF NOT EXISTS platform_scope_links_owner_status_idx
  ON public.platform_scope_links (owner_id, status, resource_type);
CREATE INDEX IF NOT EXISTS platform_scope_links_workspace_idx
  ON public.platform_scope_links (workspace_id, resource_type, resource_id)
  WHERE workspace_id IS NOT NULL;

ALTER TABLE public.platform_scope_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_scope_links_member_read ON public.platform_scope_links;
CREATE POLICY platform_scope_links_member_read ON public.platform_scope_links
  FOR SELECT TO authenticated
  USING (workspace_id IS NOT NULL AND public.platform_is_workspace_member(workspace_id));

REVOKE ALL ON TABLE public.platform_scope_links FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.platform_scope_links TO authenticated;
GRANT ALL ON TABLE public.platform_scope_links TO service_role;

CREATE OR REPLACE FUNCTION public.platform_scope_links_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_platform_scope_links_updated_at ON public.platform_scope_links;
CREATE TRIGGER set_platform_scope_links_updated_at
  BEFORE UPDATE ON public.platform_scope_links
  FOR EACH ROW EXECUTE FUNCTION public.platform_scope_links_touch_updated_at();
