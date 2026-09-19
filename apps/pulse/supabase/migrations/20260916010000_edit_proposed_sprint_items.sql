-- Package C: proposed sprint items may be edited until owner approval.
ALTER TABLE public.sprint_items
  ADD COLUMN IF NOT EXISTS worker_id TEXT;

CREATE OR REPLACE FUNCTION public.update_proposed_sprint_item(
  p_item_id UUID,
  p_sprint_id UUID,
  p_owner_id UUID,
  p_expected_sprint_revision INTEGER,
  p_title TEXT,
  p_description TEXT,
  p_priority INTEGER,
  p_estimate_minutes INTEGER DEFAULT NULL,
  p_worker_id TEXT DEFAULT NULL
)
RETURNS TABLE (sprint_id UUID, item_id UUID, sprint_revision INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  locked_sprint public.sprints%ROWTYPE;
  locked_item public.sprint_items%ROWTYPE;
BEGIN
  IF p_item_id IS NULL OR p_sprint_id IS NULL OR p_owner_id IS NULL
    OR p_expected_sprint_revision IS NULL OR p_title IS NULL OR char_length(trim(p_title)) NOT BETWEEN 1 AND 240
    OR p_description IS NULL OR char_length(p_description) > 2000
    OR p_priority IS NULL OR p_priority NOT BETWEEN 1 AND 5
    OR (p_estimate_minutes IS NOT NULL AND p_estimate_minutes NOT BETWEEN 1 AND 10080)
    OR (p_worker_id IS NOT NULL AND char_length(trim(p_worker_id)) = 0) THEN
    RAISE EXCEPTION 'Proposed sprint item payload is invalid.';
  END IF;

  SELECT * INTO locked_sprint FROM public.sprints
  WHERE id = p_sprint_id AND owner_id = p_owner_id FOR UPDATE;
  IF NOT FOUND OR locked_sprint.status <> 'proposed' OR locked_sprint.revision <> p_expected_sprint_revision THEN
    RAISE EXCEPTION 'Sprint revision conflict or sprint is no longer editable.';
  END IF;

  SELECT * INTO locked_item FROM public.sprint_items
  WHERE id = p_item_id AND sprint_id = p_sprint_id AND owner_id = p_owner_id FOR UPDATE;
  IF NOT FOUND OR locked_item.status = 'cancelled' THEN
    RAISE EXCEPTION 'Proposed sprint item not found.';
  END IF;

  UPDATE public.sprint_items
  SET title = trim(p_title), description = p_description, priority = p_priority,
      estimate_minutes = p_estimate_minutes, worker_id = NULLIF(trim(p_worker_id), ''),
      revision = locked_item.revision + 1, updated_at = now()
  WHERE id = p_item_id;

  UPDATE public.sprints
  SET revision = locked_sprint.revision + 1, updated_at = now()
  WHERE id = p_sprint_id;

  RETURN QUERY SELECT p_sprint_id, p_item_id, locked_sprint.revision + 1;
END;
$$;

REVOKE ALL ON FUNCTION public.update_proposed_sprint_item(UUID, UUID, UUID, INTEGER, TEXT, TEXT, INTEGER, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_proposed_sprint_item(UUID, UUID, UUID, INTEGER, TEXT, TEXT, INTEGER, INTEGER, TEXT) TO service_role;

-- Preserve the selected worker when the owner approves a proposal.
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

  IF locked_sprint.status = 'approved' THEN
    RETURN QUERY SELECT p_sprint_id, 'approved'::TEXT,
      (SELECT count(*)::INTEGER FROM public.agent_assignments a
       JOIN public.sprint_items si ON si.id = a.sprint_item_id
       WHERE si.sprint_id = p_sprint_id);
    RETURN;
  END IF;
  IF locked_sprint.status <> 'proposed' THEN RAISE EXCEPTION 'Sprint cannot be approved from current status'; END IF;
  IF p_expected_revision IS NULL OR locked_sprint.revision <> p_expected_revision THEN RAISE EXCEPTION 'Sprint revision conflict'; END IF;

  UPDATE public.sprints
  SET status = 'approved', approved_at = now(), approved_by = p_owner_id,
      revision = revision + 1, updated_at = now()
  WHERE id = p_sprint_id;

  INSERT INTO public.agent_assignments (owner_id, sprint_item_id, property_id, property_revision, worker_id, instructions, status)
    SELECT p_owner_id, si.id, si.property_id, si.property_revision, si.worker_id, si.title,
      CASE WHEN si.worker_id IS NULL THEN 'unassigned' ELSE 'assigned' END
    FROM public.sprint_items si
    WHERE si.sprint_id = p_sprint_id AND si.owner_id = p_owner_id AND si.status <> 'cancelled'
    ON CONFLICT (sprint_item_id) DO NOTHING;

  RETURN QUERY SELECT p_sprint_id, 'approved'::TEXT,
    (SELECT count(*)::INTEGER FROM public.agent_assignments a
     JOIN public.sprint_items si ON si.id = a.sprint_item_id
     WHERE si.sprint_id = p_sprint_id);
END;
$$;

REVOKE ALL ON FUNCTION public.approve_sprint_with_assignments(UUID, UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_sprint_with_assignments(UUID, UUID, INTEGER) TO service_role;
