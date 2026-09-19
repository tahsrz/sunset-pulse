-- OP01: explicit platform workspace identity and membership boundary.
-- This is additive. Existing owner_id, scheduling-team and tenant-site policies
-- remain authoritative until a later packet migrates a domain deliberately.

CREATE TABLE IF NOT EXISTS public.platform_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('personal', 'team')),
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 160),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.platform_workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'reviewer', 'viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS platform_personal_workspace_owner_idx
  ON public.platform_workspaces (created_by)
  WHERE kind = 'personal' AND status = 'active';
CREATE INDEX IF NOT EXISTS platform_memberships_user_status_idx
  ON public.platform_memberships (user_id, status, workspace_id);
CREATE INDEX IF NOT EXISTS platform_memberships_workspace_status_idx
  ON public.platform_memberships (workspace_id, status, role);

CREATE TABLE IF NOT EXISTS public.platform_site_links (
  workspace_id UUID NOT NULL REFERENCES public.platform_workspaces(id) ON DELETE CASCADE,
  site_config_id UUID NOT NULL REFERENCES public.site_config(id) ON DELETE CASCADE,
  linked_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, site_config_id),
  UNIQUE (site_config_id)
);

CREATE TABLE IF NOT EXISTS public.platform_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.platform_workspaces(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_kind TEXT NOT NULL CHECK (actor_kind IN ('user', 'service')),
  action TEXT NOT NULL CHECK (char_length(btrim(action)) BETWEEN 1 AND 160),
  resource_type TEXT NOT NULL CHECK (char_length(btrim(resource_type)) BETWEEN 1 AND 120),
  resource_id TEXT,
  correlation_id UUID,
  safe_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS platform_audit_workspace_time_idx
  ON public.platform_audit_events (workspace_id, occurred_at DESC);

ALTER TABLE public.platform_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_site_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_audit_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.platform_is_workspace_member(p_workspace_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_memberships AS membership
    WHERE membership.workspace_id = p_workspace_id
      AND membership.user_id = COALESCE(p_user_id, auth.uid())
      AND membership.status = 'active'
  )
$$;

DROP POLICY IF EXISTS platform_workspace_member_read ON public.platform_workspaces;
CREATE POLICY platform_workspace_member_read ON public.platform_workspaces
  FOR SELECT TO authenticated
  USING (public.platform_is_workspace_member(id));

DROP POLICY IF EXISTS platform_membership_self_or_workspace_admin_read ON public.platform_memberships;
CREATE POLICY platform_membership_self_or_workspace_admin_read ON public.platform_memberships
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.platform_is_workspace_member(workspace_id)
  );

DROP POLICY IF EXISTS platform_site_link_member_read ON public.platform_site_links;
CREATE POLICY platform_site_link_member_read ON public.platform_site_links
  FOR SELECT TO authenticated
  USING (public.platform_is_workspace_member(workspace_id));

DROP POLICY IF EXISTS platform_audit_member_read ON public.platform_audit_events;
CREATE POLICY platform_audit_member_read ON public.platform_audit_events
  FOR SELECT TO authenticated
  USING (public.platform_is_workspace_member(workspace_id));

CREATE OR REPLACE FUNCTION public.platform_create_workspace_with_owner(
  p_actor_id UUID,
  p_workspace_id UUID,
  p_kind TEXT,
  p_name TEXT
)
RETURNS TABLE (workspace_id UUID, membership_id UUID, reused BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  workspace_row public.platform_workspaces%ROWTYPE;
  membership_row public.platform_memberships%ROWTYPE;
  normalized_name TEXT := btrim(COALESCE(p_name, ''));
BEGIN
  IF p_actor_id IS NULL OR p_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Workspace actor and ID are required' USING ERRCODE = '22023';
  END IF;
  IF p_kind NOT IN ('personal', 'team') THEN
    RAISE EXCEPTION 'Unsupported workspace kind' USING ERRCODE = '22023';
  END IF;
  IF char_length(normalized_name) NOT BETWEEN 1 AND 160 THEN
    RAISE EXCEPTION 'Workspace name must be between 1 and 160 characters' USING ERRCODE = '22023';
  END IF;

  IF p_kind = 'personal' THEN
    SELECT * INTO workspace_row
    FROM public.platform_workspaces
    WHERE created_by = p_actor_id AND kind = 'personal' AND status = 'active'
    FOR UPDATE;
    IF FOUND THEN
      SELECT * INTO membership_row
      FROM public.platform_memberships
      WHERE platform_memberships.workspace_id = workspace_row.id AND platform_memberships.user_id = p_actor_id
      FOR UPDATE;
      IF NOT FOUND THEN
        INSERT INTO public.platform_memberships (workspace_id, user_id, role)
        VALUES (workspace_row.id, p_actor_id, 'owner')
        RETURNING * INTO membership_row;
      END IF;
      RETURN QUERY SELECT workspace_row.id, membership_row.id, TRUE;
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.platform_workspaces (id, kind, name, created_by)
  VALUES (p_workspace_id, p_kind, normalized_name, p_actor_id)
  RETURNING * INTO workspace_row;

  INSERT INTO public.platform_memberships (workspace_id, user_id, role)
  VALUES (workspace_row.id, p_actor_id, 'owner')
  RETURNING * INTO membership_row;

  INSERT INTO public.platform_audit_events (
    workspace_id, actor_id, actor_kind, action, resource_type, resource_id, safe_metadata
  ) VALUES (
    workspace_row.id, p_actor_id, 'user', 'workspace.created', 'workspace', workspace_row.id::TEXT,
    jsonb_build_object('kind', p_kind)
  );

  RETURN QUERY SELECT workspace_row.id, membership_row.id, FALSE;
EXCEPTION
  WHEN unique_violation THEN
    IF p_kind <> 'personal' THEN RAISE; END IF;
    SELECT * INTO workspace_row
    FROM public.platform_workspaces
    WHERE created_by = p_actor_id AND kind = 'personal' AND status = 'active'
    FOR UPDATE;
    IF NOT FOUND THEN RAISE; END IF;
    SELECT * INTO membership_row
    FROM public.platform_memberships
    WHERE platform_memberships.workspace_id = workspace_row.id AND platform_memberships.user_id = p_actor_id
    FOR UPDATE;
    IF NOT FOUND THEN
      INSERT INTO public.platform_memberships (workspace_id, user_id, role)
      VALUES (workspace_row.id, p_actor_id, 'owner')
      RETURNING * INTO membership_row;
    END IF;
    RETURN QUERY SELECT workspace_row.id, membership_row.id, TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_is_workspace_member(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.platform_is_workspace_member(UUID, UUID) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.platform_create_workspace_with_owner(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.platform_create_workspace_with_owner(UUID, UUID, TEXT, TEXT) TO service_role;
