-- Package C: assignment completion propagates through all linked records in a
-- single transaction and uses the same sprint-first lock order as review edits.
CREATE OR REPLACE FUNCTION public.complete_sprint_assignment(
  p_assignment_id UUID,
  p_owner_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  assignment_row public.agent_assignments%ROWTYPE;
  item_row public.sprint_items%ROWTYPE;
  sprint_status TEXT;
BEGIN
  SELECT a.sprint_item_id INTO assignment_row.sprint_item_id
  FROM public.agent_assignments a
  WHERE a.id = p_assignment_id AND a.owner_id = p_owner_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Assignment not found'; END IF;

  SELECT si.sprint_id, si.backlog_item_id INTO item_row.sprint_id, item_row.backlog_item_id
  FROM public.sprint_items si
  WHERE si.id = assignment_row.sprint_item_id AND si.owner_id = p_owner_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sprint item not found'; END IF;

  SELECT s.status INTO sprint_status FROM public.sprints s
  WHERE s.id = item_row.sprint_id AND s.owner_id = p_owner_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sprint not found'; END IF;

  SELECT * INTO assignment_row FROM public.agent_assignments
  WHERE id = p_assignment_id AND owner_id = p_owner_id FOR UPDATE;
  SELECT * INTO item_row FROM public.sprint_items
  WHERE id = assignment_row.sprint_item_id AND owner_id = p_owner_id FOR UPDATE;
  IF assignment_row.status = 'cancelled' OR item_row.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cancelled assignment cannot be completed';
  END IF;

  -- Replays are safe and still repair linked terminal state if an older caller
  -- completed only the assignment row.
  UPDATE public.agent_assignments SET status = 'completed', updated_at = now()
  WHERE id = p_assignment_id;
  UPDATE public.sprint_items SET status = 'done', updated_at = now()
  WHERE id = item_row.id;
  IF item_row.backlog_item_id IS NOT NULL THEN
    UPDATE public.sprint_backlog_items SET status = 'done', updated_at = now()
    WHERE id = item_row.backlog_item_id AND owner_id = p_owner_id;
  END IF;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_sprint_assignment(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_sprint_assignment(UUID, UUID) TO service_role;
