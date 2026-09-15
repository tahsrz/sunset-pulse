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
  created_count INTEGER := 0;
BEGIN
  SELECT * INTO locked_sprint FROM public.sprints
    WHERE id = p_sprint_id AND owner_id = p_owner_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sprint not found'; END IF;
  IF p_expected_revision IS NOT NULL AND locked_sprint.revision <> p_expected_revision THEN
    RAISE EXCEPTION 'Sprint revision conflict';
  END IF;
  IF locked_sprint.status = 'proposed' THEN
    UPDATE public.sprints SET status = 'approved', approved_at = now(), approved_by = p_owner_id, revision = revision + 1 WHERE id = p_sprint_id;
    INSERT INTO public.agent_assignments (owner_id, sprint_item_id, instructions, status)
      SELECT p_owner_id, si.id, si.title, 'unassigned'
      FROM public.sprint_items si
      WHERE si.sprint_id = p_sprint_id AND si.owner_id = p_owner_id AND si.status <> 'cancelled'
      ON CONFLICT (sprint_item_id) DO NOTHING;
    GET DIAGNOSTICS created_count = ROW_COUNT;
  ELSIF locked_sprint.status <> 'approved' THEN
    RAISE EXCEPTION 'Sprint cannot be approved from current status';
  END IF;
  RETURN QUERY SELECT p_sprint_id, 'approved'::TEXT, (SELECT count(*)::INTEGER FROM public.agent_assignments a JOIN public.sprint_items si ON si.id = a.sprint_item_id WHERE si.sprint_id = p_sprint_id);
END;
$$;

REVOKE ALL ON FUNCTION public.approve_sprint_with_assignments(UUID, UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_sprint_with_assignments(UUID, UUID, INTEGER) TO service_role;
