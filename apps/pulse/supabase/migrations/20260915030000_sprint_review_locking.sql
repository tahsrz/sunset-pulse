-- Package C: edits and approval must serialize on the sprint revision.
CREATE OR REPLACE FUNCTION public.approve_sprint_with_assignments(
  p_sprint_id UUID,
  p_owner_id UUID,
  p_expected_revision INTEGER DEFAULT NULL
)
RETURNS TABLE (sprint_id UUID, sprint_status TEXT, assignment_count INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  locked_sprint public.sprints%ROWTYPE;
BEGIN
  SELECT * INTO locked_sprint FROM public.sprints
  WHERE id = p_sprint_id AND owner_id = p_owner_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sprint not found'; END IF;

  -- Approval is idempotent after the first successful transition. A replay
  -- returns the same assignment set even when the original revision is stale.
  IF locked_sprint.status = 'approved' THEN
    RETURN QUERY SELECT p_sprint_id, 'approved'::TEXT,
      (SELECT count(*)::INTEGER FROM public.agent_assignments a
       JOIN public.sprint_items si ON si.id = a.sprint_item_id
       WHERE si.sprint_id = p_sprint_id);
    RETURN;
  END IF;
  IF locked_sprint.status <> 'proposed' THEN
    RAISE EXCEPTION 'Sprint cannot be approved from current status';
  END IF;
  IF p_expected_revision IS NULL OR locked_sprint.revision <> p_expected_revision THEN
    RAISE EXCEPTION 'Sprint revision conflict';
  END IF;

  UPDATE public.sprints
  SET status = 'approved', approved_at = now(), approved_by = p_owner_id,
      revision = revision + 1, updated_at = now()
  WHERE id = p_sprint_id;
  INSERT INTO public.agent_assignments (owner_id, sprint_item_id, property_id, property_revision, instructions, status)
    SELECT p_owner_id, si.id, si.property_id, si.property_revision, si.title, 'unassigned'
    FROM public.sprint_items si
    WHERE si.sprint_id = p_sprint_id AND si.owner_id = p_owner_id AND si.status <> 'cancelled'
    ON CONFLICT (sprint_item_id) DO NOTHING;

  RETURN QUERY SELECT p_sprint_id, 'approved'::TEXT,
    (SELECT count(*)::INTEGER FROM public.agent_assignments a
     JOIN public.sprint_items si ON si.id = a.sprint_item_id
     WHERE si.sprint_id = p_sprint_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_sprint_item(
  p_item_id UUID,
  p_sprint_id UUID,
  p_owner_id UUID,
  p_expected_revision INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  locked_sprint public.sprints%ROWTYPE;
  item_owner UUID;
BEGIN
  SELECT * INTO locked_sprint FROM public.sprints
  WHERE id = p_sprint_id AND owner_id = p_owner_id FOR UPDATE;
  IF NOT FOUND OR locked_sprint.status <> 'proposed'
    OR p_expected_revision IS NULL OR locked_sprint.revision <> p_expected_revision THEN
    RAISE EXCEPTION 'Sprint revision conflict or sprint is not editable';
  END IF;
  SELECT owner_id INTO item_owner FROM public.sprint_items
  WHERE id = p_item_id AND sprint_id = p_sprint_id FOR UPDATE;
  IF NOT FOUND OR item_owner <> p_owner_id THEN RAISE EXCEPTION 'Sprint item not found'; END IF;
  UPDATE public.sprint_items SET status = 'cancelled', updated_at = now()
  WHERE id = p_item_id;
  UPDATE public.sprints SET revision = revision + 1, updated_at = now()
  WHERE id = p_sprint_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_sprint_with_assignments(UUID, UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_sprint_with_assignments(UUID, UUID, INTEGER) TO service_role;
REVOKE ALL ON FUNCTION public.remove_sprint_item(UUID, UUID, UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remove_sprint_item(UUID, UUID, UUID, INTEGER) TO service_role;
