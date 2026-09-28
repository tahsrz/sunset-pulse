-- Workspace invitations and membership revocation. Lock order is workspace,
-- actor membership, target invitation/membership, matching platform run guards.
CREATE TABLE public.platform_workspace_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.platform_workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL CHECK (email = lower(btrim(email)) AND char_length(email) BETWEEN 3 AND 320),
  role TEXT NOT NULL CHECK (role IN ('admin','member','reviewer','viewer')),
  token_hash TEXT NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked','expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  accepted_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  accepted_membership_id UUID REFERENCES public.platform_memberships(id) ON DELETE RESTRICT,
  accepted_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((status = 'accepted') = (accepted_by IS NOT NULL AND accepted_membership_id IS NOT NULL AND accepted_at IS NOT NULL)),
  CHECK ((status = 'revoked') = (revoked_by IS NOT NULL AND revoked_at IS NOT NULL))
);
CREATE UNIQUE INDEX platform_workspace_pending_invite_email_idx
  ON public.platform_workspace_invitations(workspace_id, email) WHERE status = 'pending';
CREATE INDEX platform_workspace_invites_admin_idx
  ON public.platform_workspace_invitations(workspace_id, created_at DESC, id);
ALTER TABLE public.platform_workspace_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_workspace_invitations FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.platform_create_workspace_invitation(
  p_actor_id UUID, p_workspace_id UUID, p_email TEXT, p_role TEXT, p_token_hash TEXT, p_expires_at TIMESTAMPTZ
) RETURNS SETOF public.platform_workspace_invitations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor_role TEXT; saved public.platform_workspace_invitations%ROWTYPE;
BEGIN
  PERFORM 1 FROM public.platform_workspaces WHERE id=p_workspace_id AND kind='team' AND status='active' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Workspace not found' USING ERRCODE='P0002'; END IF;
  SELECT m.role INTO actor_role FROM public.platform_memberships m
   WHERE m.workspace_id=p_workspace_id AND m.user_id=p_actor_id AND m.status='active' FOR SHARE;
  IF actor_role IS NULL OR actor_role NOT IN ('owner','admin') THEN RAISE EXCEPTION 'Workspace action denied' USING ERRCODE='42501'; END IF;
  IF p_email IS NULL OR p_email <> lower(btrim(p_email)) OR p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    OR char_length(p_email)>320 OR p_role IS NULL OR p_role NOT IN ('admin','member','reviewer','viewer')
    OR (p_role='admin' AND actor_role <> 'owner') OR p_token_hash IS NULL OR p_token_hash !~ '^[a-f0-9]{64}$'
    OR p_expires_at IS NULL OR p_expires_at <= now() OR p_expires_at > now()+interval '30 days' THEN
    RAISE EXCEPTION 'Invalid invitation' USING ERRCODE='22023';
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users u JOIN public.platform_memberships m ON m.user_id=u.id
      WHERE m.workspace_id=p_workspace_id AND m.status='active' AND lower(u.email)=p_email) THEN
    RAISE EXCEPTION 'User is already a workspace member' USING ERRCODE='23505';
  END IF;
  UPDATE public.platform_workspace_invitations SET status='expired'
   WHERE workspace_id=p_workspace_id AND email=p_email AND status='pending' AND expires_at<=now();
  INSERT INTO public.platform_workspace_invitations(workspace_id,email,role,token_hash,expires_at,created_by)
   VALUES(p_workspace_id,p_email,p_role,p_token_hash,p_expires_at,p_actor_id) RETURNING * INTO saved;
  INSERT INTO public.platform_audit_events(workspace_id,actor_id,actor_kind,action,resource_type,resource_id,safe_metadata)
   VALUES(p_workspace_id,p_actor_id,'user','workspace.invitation_created','workspace_invitation',saved.id::text,jsonb_build_object('role',p_role));
  RETURN NEXT saved;
END $$;

CREATE FUNCTION public.platform_list_workspace_invitations(p_actor_id UUID,p_workspace_id UUID)
RETURNS TABLE(id UUID,workspace_id UUID,email TEXT,role TEXT,status TEXT,expires_at TIMESTAMPTZ,created_by UUID,accepted_by UUID,accepted_membership_id UUID,accepted_at TIMESTAMPTZ,revoked_by UUID,revoked_at TIMESTAMPTZ,created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor_role TEXT;
BEGIN
  PERFORM 1 FROM public.platform_workspaces w WHERE w.id=p_workspace_id AND w.status='active' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Workspace not found' USING ERRCODE='P0002'; END IF;
  SELECT m.role INTO actor_role FROM public.platform_memberships m
   WHERE m.workspace_id=p_workspace_id AND m.user_id=p_actor_id AND m.status='active' FOR SHARE;
  IF actor_role IS NULL OR actor_role NOT IN ('owner','admin') THEN RAISE EXCEPTION 'Workspace action denied' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT i.id,i.workspace_id,i.email,i.role,i.status,i.expires_at,i.created_by,i.accepted_by,i.accepted_membership_id,i.accepted_at,i.revoked_by,i.revoked_at,i.created_at FROM public.platform_workspace_invitations i
   WHERE i.workspace_id=p_workspace_id ORDER BY i.created_at DESC,i.id LIMIT 100;
END $$;

CREATE FUNCTION public.platform_list_workspace_members(p_actor_id UUID,p_workspace_id UUID)
RETURNS TABLE(membership_id UUID,user_id UUID,email TEXT,role TEXT,status TEXT,revision INTEGER,created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor_role TEXT;
BEGIN
  PERFORM 1 FROM public.platform_workspaces w WHERE w.id=p_workspace_id AND w.status='active' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Workspace not found' USING ERRCODE='P0002'; END IF;
  SELECT m.role INTO actor_role FROM public.platform_memberships m
   WHERE m.workspace_id=p_workspace_id AND m.user_id=p_actor_id AND m.status='active' FOR SHARE;
  IF actor_role IS NULL OR actor_role NOT IN ('owner','admin') THEN RAISE EXCEPTION 'Workspace action denied' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT m.id,m.user_id,u.email,m.role,m.status,m.revision,m.created_at
   FROM public.platform_memberships m JOIN auth.users u ON u.id=m.user_id
   WHERE m.workspace_id=p_workspace_id ORDER BY m.created_at,m.id LIMIT 200;
END $$;

CREATE FUNCTION public.platform_revoke_workspace_invitation(p_actor_id UUID,p_workspace_id UUID,p_invitation_id UUID)
RETURNS SETOF public.platform_workspace_invitations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor_role TEXT; saved public.platform_workspace_invitations%ROWTYPE;
BEGIN
  PERFORM 1 FROM public.platform_workspaces WHERE id=p_workspace_id AND status='active' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Workspace not found' USING ERRCODE='P0002'; END IF;
  SELECT role INTO actor_role FROM public.platform_memberships
   WHERE workspace_id=p_workspace_id AND user_id=p_actor_id AND status='active' FOR SHARE;
  IF actor_role IS NULL OR actor_role NOT IN ('owner','admin') THEN RAISE EXCEPTION 'Workspace action denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO saved FROM public.platform_workspace_invitations
   WHERE id=p_invitation_id AND workspace_id=p_workspace_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invitation not found' USING ERRCODE='P0002'; END IF;
  IF saved.status='revoked' THEN RETURN NEXT saved; RETURN; END IF;
  IF saved.status <> 'pending' THEN RAISE EXCEPTION 'Invitation is no longer pending' USING ERRCODE='40001'; END IF;
  UPDATE public.platform_workspace_invitations SET status='revoked',revoked_by=p_actor_id,revoked_at=now()
   WHERE id=saved.id RETURNING * INTO saved;
  INSERT INTO public.platform_audit_events(workspace_id,actor_id,actor_kind,action,resource_type,resource_id)
   VALUES(p_workspace_id,p_actor_id,'user','workspace.invitation_revoked','workspace_invitation',saved.id::text);
  RETURN NEXT saved;
END $$;

CREATE FUNCTION public.platform_accept_workspace_invitation(p_actor_id UUID,p_token_hash TEXT)
RETURNS TABLE(workspace_id UUID,membership_id UUID,role TEXT,replayed BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE invite public.platform_workspace_invitations%ROWTYPE; member public.platform_memberships%ROWTYPE; actor_email TEXT; target_workspace_id UUID;
BEGIN
  SELECT i.workspace_id INTO target_workspace_id FROM public.platform_workspace_invitations i WHERE i.token_hash=p_token_hash;
  IF target_workspace_id IS NULL THEN RAISE EXCEPTION 'Invitation not found' USING ERRCODE='P0002'; END IF;
  PERFORM 1 FROM public.platform_workspaces w WHERE w.id=target_workspace_id AND w.status='active' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Workspace not found' USING ERRCODE='P0002'; END IF;
  SELECT * INTO invite FROM public.platform_workspace_invitations i WHERE i.token_hash=p_token_hash AND i.workspace_id=target_workspace_id FOR UPDATE;
  SELECT lower(email) INTO actor_email FROM auth.users WHERE id=p_actor_id;
  IF actor_email IS NULL OR actor_email <> invite.email THEN RAISE EXCEPTION 'Invitation email does not match signed-in user' USING ERRCODE='42501'; END IF;
  IF invite.status='accepted' AND invite.accepted_by=p_actor_id THEN
    workspace_id:=invite.workspace_id; membership_id:=invite.accepted_membership_id; role:=invite.role; replayed:=true; RETURN NEXT; RETURN;
  END IF;
  IF invite.status <> 'pending' THEN RAISE EXCEPTION 'Invitation is not pending' USING ERRCODE='40001'; END IF;
  IF invite.expires_at <= now() THEN
    UPDATE public.platform_workspace_invitations SET status='expired' WHERE id=invite.id;
    RETURN;
  END IF;
  SELECT * INTO member FROM public.platform_memberships WHERE platform_memberships.workspace_id=invite.workspace_id AND user_id=p_actor_id FOR UPDATE;
  IF FOUND THEN
    IF member.status='active' THEN RAISE EXCEPTION 'User is already a workspace member' USING ERRCODE='23505'; END IF;
    UPDATE public.platform_memberships SET role=invite.role,status='active',revision=revision+1,updated_at=now()
     WHERE id=member.id RETURNING * INTO member;
  ELSE
    INSERT INTO public.platform_memberships(workspace_id,user_id,role) VALUES(invite.workspace_id,p_actor_id,invite.role) RETURNING * INTO member;
  END IF;
  UPDATE public.platform_workspace_invitations SET status='accepted',accepted_by=p_actor_id,accepted_membership_id=member.id,accepted_at=now()
   WHERE id=invite.id;
  INSERT INTO public.platform_audit_events(workspace_id,actor_id,actor_kind,action,resource_type,resource_id,safe_metadata)
   VALUES(invite.workspace_id,p_actor_id,'user','workspace.invitation_accepted','workspace_invitation',invite.id::text,jsonb_build_object('membershipId',member.id));
  workspace_id:=invite.workspace_id; membership_id:=member.id; role:=member.role; replayed:=false; RETURN NEXT;
END $$;

CREATE FUNCTION public.platform_revoke_workspace_membership(p_actor_id UUID,p_workspace_id UUID,p_membership_id UUID)
RETURNS SETOF public.platform_memberships
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor_role TEXT; target public.platform_memberships%ROWTYPE;
BEGIN
  PERFORM 1 FROM public.platform_workspaces WHERE id=p_workspace_id AND status='active' AND kind='team' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Workspace not found' USING ERRCODE='P0002'; END IF;
  SELECT role INTO actor_role FROM public.platform_memberships WHERE workspace_id=p_workspace_id AND user_id=p_actor_id AND status='active' FOR SHARE;
  IF actor_role IS NULL OR actor_role NOT IN ('owner','admin') THEN RAISE EXCEPTION 'Workspace action denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO target FROM public.platform_memberships WHERE id=p_membership_id AND workspace_id=p_workspace_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Membership not found' USING ERRCODE='P0002'; END IF;
  IF target.role='owner' THEN RAISE EXCEPTION 'Workspace owner cannot be revoked' USING ERRCODE='42501'; END IF;
  IF actor_role='admin' AND target.role='admin' THEN RAISE EXCEPTION 'Only an owner can revoke an admin' USING ERRCODE='42501'; END IF;
  IF target.status='revoked' THEN RETURN NEXT target; RETURN; END IF;
  UPDATE public.platform_memberships SET status='revoked',revision=revision+1,updated_at=now() WHERE id=target.id RETURNING * INTO target;
  INSERT INTO public.platform_audit_events(workspace_id,actor_id,actor_kind,action,resource_type,resource_id,safe_metadata)
   VALUES(p_workspace_id,p_actor_id,'user','workspace.membership_revoked','workspace_membership',target.id::text,jsonb_build_object('role',target.role));
  RETURN NEXT target;
END $$;

REVOKE ALL ON FUNCTION public.platform_create_workspace_invitation(UUID,UUID,TEXT,TEXT,TEXT,TIMESTAMPTZ),
 public.platform_list_workspace_invitations(UUID,UUID),public.platform_list_workspace_members(UUID,UUID),public.platform_revoke_workspace_invitation(UUID,UUID,UUID),
 public.platform_accept_workspace_invitation(UUID,TEXT),public.platform_revoke_workspace_membership(UUID,UUID,UUID)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.platform_create_workspace_invitation(UUID,UUID,TEXT,TEXT,TEXT,TIMESTAMPTZ),
 public.platform_list_workspace_invitations(UUID,UUID),public.platform_list_workspace_members(UUID,UUID),public.platform_revoke_workspace_invitation(UUID,UUID,UUID),
 public.platform_accept_workspace_invitation(UUID,TEXT),public.platform_revoke_workspace_membership(UUID,UUID,UUID)
 TO service_role;
