-- OP02: atomic workspace-aware property mutations.
-- The legacy owner-scoped services remain available; these RPCs are the
-- compatibility boundary for callers that already have a workspace context.

CREATE OR REPLACE FUNCTION public.platform_save_property_shortlist_entry(
  p_actor_id UUID,
  p_workspace_id UUID,
  p_property_id UUID,
  p_expected_revision INTEGER,
  p_address TEXT,
  p_city TEXT,
  p_state TEXT,
  p_postal_code TEXT,
  p_mls_id TEXT,
  p_county TEXT,
  p_parcel_number TEXT,
  p_property_kind TEXT,
  p_unresolved_questions JSONB
)
RETURNS SETOF public.property_shortlist_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  membership_role TEXT;
  target_owner UUID;
  saved public.property_shortlist_entries%ROWTYPE;
BEGIN
  IF p_actor_id IS NULL OR p_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Property actor and workspace are required' USING ERRCODE = '22023';
  END IF;

  SELECT membership.role INTO membership_role
  FROM public.platform_memberships AS membership
  WHERE membership.workspace_id = p_workspace_id
    AND membership.user_id = p_actor_id
    AND membership.status = 'active'
    AND membership.role IN ('owner', 'admin', 'member');
  IF membership_role IS NULL THEN
    RAISE EXCEPTION 'Property edit access denied' USING ERRCODE = '42501';
  END IF;

  IF p_property_kind NOT IN ('residential', 'land')
    OR p_state IS NULL OR char_length(btrim(p_state)) <> 2
    OR p_unresolved_questions IS NULL OR jsonb_typeof(p_unresolved_questions) <> 'array'
    OR jsonb_array_length(p_unresolved_questions) > 50 THEN
    RAISE EXCEPTION 'Invalid property shortlist values' USING ERRCODE = '22023';
  END IF;

  IF p_property_id IS NULL THEN
    INSERT INTO public.property_shortlist_entries (
      owner_id, area_key, address, city, state, postal_code, mls_id,
      county, parcel_number, property_kind, unresolved_questions, status, revision
    ) VALUES (
      p_actor_id, 'keller-westlake', p_address, p_city, p_state, p_postal_code, p_mls_id,
      p_county, p_parcel_number, p_property_kind, p_unresolved_questions, 'active', 1
    ) RETURNING * INTO saved;

    INSERT INTO public.platform_scope_links (
      resource_type, resource_id, owner_id, workspace_id, status,
      reason, source_revision, revision
    ) VALUES (
      'property_shortlist', saved.id::TEXT, saved.owner_id, p_workspace_id, 'mapped',
      NULL, saved.revision, 1
    );
    RETURN NEXT saved;
    RETURN;
  END IF;

  SELECT scope.owner_id INTO target_owner
  FROM public.platform_scope_links AS scope
  WHERE scope.resource_type = 'property_shortlist'
    AND scope.resource_id = p_property_id::TEXT
    AND scope.workspace_id = p_workspace_id
    AND scope.status = 'mapped'
  FOR UPDATE;
  IF target_owner IS NULL THEN
    RAISE EXCEPTION 'Property is not mapped into this workspace' USING ERRCODE = 'P0002';
  END IF;
  IF p_expected_revision IS NULL THEN
    RAISE EXCEPTION 'Expected property revision is required' USING ERRCODE = '22023';
  END IF;

  UPDATE public.property_shortlist_entries
  SET address = p_address,
      city = p_city,
      state = p_state,
      postal_code = p_postal_code,
      mls_id = p_mls_id,
      county = p_county,
      parcel_number = p_parcel_number,
      property_kind = p_property_kind,
      unresolved_questions = p_unresolved_questions,
      status = 'active',
      revision = revision + 1,
      updated_at = now()
  WHERE id = p_property_id
    AND owner_id = target_owner
    AND revision = p_expected_revision
  RETURNING * INTO saved;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property shortlist revision conflict' USING ERRCODE = '40001';
  END IF;

  UPDATE public.platform_scope_links
  SET source_revision = saved.revision,
      revision = revision + 1,
      updated_at = now()
  WHERE resource_type = 'property_shortlist'
    AND resource_id = saved.id::TEXT
    AND workspace_id = p_workspace_id;

  RETURN NEXT saved;
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_archive_property_shortlist_entry(
  p_actor_id UUID,
  p_workspace_id UUID,
  p_property_id UUID,
  p_expected_revision INTEGER
)
RETURNS SETOF public.property_shortlist_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  membership_role TEXT;
  target_owner UUID;
  archived public.property_shortlist_entries%ROWTYPE;
BEGIN
  SELECT membership.role INTO membership_role
  FROM public.platform_memberships AS membership
  WHERE membership.workspace_id = p_workspace_id
    AND membership.user_id = p_actor_id
    AND membership.status = 'active'
    AND membership.role IN ('owner', 'admin', 'member');
  IF membership_role IS NULL THEN
    RAISE EXCEPTION 'Property edit access denied' USING ERRCODE = '42501';
  END IF;
  IF p_expected_revision IS NULL THEN
    RAISE EXCEPTION 'Expected property revision is required' USING ERRCODE = '22023';
  END IF;

  SELECT scope.owner_id INTO target_owner
  FROM public.platform_scope_links AS scope
  WHERE scope.resource_type = 'property_shortlist'
    AND scope.resource_id = p_property_id::TEXT
    AND scope.workspace_id = p_workspace_id
    AND scope.status = 'mapped'
  FOR UPDATE;
  IF target_owner IS NULL THEN
    RAISE EXCEPTION 'Property is not mapped into this workspace' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.property_shortlist_entries
  SET status = 'archived', revision = revision + 1, updated_at = now()
  WHERE id = p_property_id
    AND owner_id = target_owner
    AND revision = p_expected_revision
  RETURNING * INTO archived;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property shortlist revision conflict' USING ERRCODE = '40001';
  END IF;

  UPDATE public.platform_scope_links
  SET source_revision = archived.revision,
      revision = revision + 1,
      updated_at = now()
  WHERE resource_type = 'property_shortlist'
    AND resource_id = archived.id::TEXT
    AND workspace_id = p_workspace_id;

  RETURN NEXT archived;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_save_property_shortlist_entry(UUID, UUID, UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.platform_save_property_shortlist_entry(UUID, UUID, UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO service_role;
REVOKE ALL ON FUNCTION public.platform_archive_property_shortlist_entry(UUID, UUID, UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.platform_archive_property_shortlist_entry(UUID, UUID, UUID, INTEGER) TO service_role;
