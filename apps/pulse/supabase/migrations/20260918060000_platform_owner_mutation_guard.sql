-- W2: legacy owner-only mutation paths must not silently operate on a record
-- that has been mapped into a team or unresolved workspace scope. No mapping
-- means the existing personal compatibility path remains available; a mapping
-- is authoritative and must be handled through workspace-aware RPCs.

CREATE OR REPLACE FUNCTION public.platform_require_owner_compatible_mutation(
  p_actor_id UUID,
  p_resource_type TEXT,
  p_resource_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  link_row public.platform_scope_links%ROWTYPE;
  workspace_row public.platform_workspaces%ROWTYPE;
BEGIN
  IF p_actor_id IS NULL OR p_resource_type NOT IN ('sprint', 'assignment', 'sprint_backlog_item')
    OR p_resource_id IS NULL OR char_length(btrim(p_resource_id)) NOT BETWEEN 1 AND 240 THEN
    RAISE EXCEPTION 'Invalid owner-compatible mutation scope' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO link_row
  FROM public.platform_scope_links
  WHERE resource_type = p_resource_type AND resource_id = btrim(p_resource_id)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF link_row.owner_id IS DISTINCT FROM p_actor_id
    OR link_row.status <> 'mapped'
    OR link_row.workspace_id IS NULL THEN
    RAISE EXCEPTION 'Mapped resource requires a workspace mutation' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO workspace_row
  FROM public.platform_workspaces
  WHERE id = link_row.workspace_id
  FOR SHARE;

  IF NOT FOUND OR workspace_row.status <> 'active'
    OR workspace_row.kind <> 'personal'
    OR workspace_row.created_by IS DISTINCT FROM p_actor_id THEN
    RAISE EXCEPTION 'Mapped resource requires a workspace mutation' USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_require_owner_compatible_mutation(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.platform_require_owner_compatible_mutation(UUID, TEXT, TEXT) TO service_role;
