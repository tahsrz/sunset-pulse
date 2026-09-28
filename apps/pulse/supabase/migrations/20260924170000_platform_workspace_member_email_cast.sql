-- The member-list RPC declares email as TEXT; auth.users.email is VARCHAR.
-- Cast explicitly so RETURN QUERY matches the function's stable result contract.
CREATE OR REPLACE FUNCTION public.platform_list_workspace_members(p_actor_id UUID,p_workspace_id UUID)
RETURNS TABLE(membership_id UUID,user_id UUID,email TEXT,role TEXT,status TEXT,revision INTEGER,created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor_role TEXT;
BEGIN
  PERFORM 1 FROM public.platform_workspaces w WHERE w.id=p_workspace_id AND w.status='active' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Workspace not found' USING ERRCODE='P0002'; END IF;
  SELECT m.role INTO actor_role FROM public.platform_memberships m
   WHERE m.workspace_id=p_workspace_id AND m.user_id=p_actor_id AND m.status='active' FOR SHARE;
  IF actor_role IS NULL OR actor_role NOT IN ('owner','admin') THEN RAISE EXCEPTION 'Workspace action denied' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT m.id,m.user_id,u.email::TEXT,m.role,m.status,m.revision,m.created_at
   FROM public.platform_memberships m JOIN auth.users u ON u.id=m.user_id
   WHERE m.workspace_id=p_workspace_id ORDER BY m.created_at,m.id LIMIT 200;
END $$;

REVOKE ALL ON FUNCTION public.platform_list_workspace_members(UUID,UUID) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.platform_list_workspace_members(UUID,UUID) TO service_role;
