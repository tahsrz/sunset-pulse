-- Preserve the personal property-task handoff as an immutable planner provenance link.
-- The sprint task remains open/in progress; this does not complete or otherwise mutate it.
ALTER TABLE public.realtor_planner_items
  ADD COLUMN source_sprint_task_id UUID
    REFERENCES public.sprint_backlog_items(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX realtor_planner_items_source_task_once_idx
  ON public.realtor_planner_items(user_id, source_sprint_task_id)
  WHERE source_sprint_task_id IS NOT NULL;

-- Retain the existing fully-atomic item/occurrence/reminder implementation and wrap it
-- so legacy request keys, audit events, recurrence logic, and response semantics remain intact.
ALTER FUNCTION public.realtor_save_planner_item(UUID,UUID,UUID,INTEGER,UUID,JSONB,JSONB)
  RENAME TO realtor_save_planner_item_without_task_identity;

CREATE FUNCTION public.realtor_save_planner_item(
  p_actor_id UUID, p_workspace_id UUID, p_item_id UUID, p_expected_revision INTEGER,
  p_request_key UUID, p_item JSONB, p_occurrences JSONB
) RETURNS TABLE(item_id UUID, revision INTEGER, reused BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  saved_id UUID;
  saved_revision INTEGER;
  was_reused BOOLEAN;
  source_task_id UUID;
  linked_task_id UUID;
  source_task public.sprint_backlog_items%ROWTYPE;
  source_property public.property_shortlist_entries%ROWTYPE;
  property_id UUID;
BEGIN
  IF p_item_id IS NOT NULL AND NULLIF(p_item->>'sourceSprintTaskId', '') IS NOT NULL THEN
    RAISE EXCEPTION 'A sprint task can only be linked when creating its planner item'
      USING ERRCODE = '22023';
  END IF;

  source_task_id := NULLIF(p_item->>'sourceSprintTaskId', '')::UUID;
  SELECT result.item_id, result.revision, result.reused
    INTO saved_id, saved_revision, was_reused
    FROM public.realtor_save_planner_item_without_task_identity(
      p_actor_id, p_workspace_id, p_item_id, p_expected_revision, p_request_key,
      CASE WHEN source_task_id IS NULL THEN p_item
           ELSE p_item || jsonb_build_object('sourceSprintTaskId', source_task_id) END,
      p_occurrences
    ) AS result;

  IF source_task_id IS NULL THEN
    RETURN QUERY SELECT saved_id, saved_revision, was_reused;
    RETURN;
  END IF;
  IF p_item->>'kind' <> 'task' THEN
    RAISE EXCEPTION 'A property sprint task can only link to a task planner item'
      USING ERRCODE = '22023';
  END IF;

  SELECT planner.source_sprint_task_id INTO linked_task_id
    FROM public.realtor_planner_items AS planner
    WHERE planner.id = saved_id AND planner.user_id = p_actor_id
      AND planner.workspace_id = p_workspace_id FOR UPDATE;
  IF linked_task_id = source_task_id THEN
    RETURN QUERY SELECT saved_id, saved_revision, was_reused;
    RETURN;
  END IF;
  IF linked_task_id IS NOT NULL THEN
    RAISE EXCEPTION 'Planner item is already linked to a different sprint task'
      USING ERRCODE = '23505';
  END IF;

  property_id := NULLIF(p_item#>>'{property,propertyId}', '')::UUID;
  IF property_id IS NULL THEN
    RAISE EXCEPTION 'A property sprint task requires its linked shortlist property'
      USING ERRCODE = '22023';
  END IF;

  SELECT property.* INTO source_property
    FROM public.property_shortlist_entries AS property
    WHERE property.id = property_id AND property.owner_id = p_actor_id
      AND property.area_key = 'keller-westlake' AND property.status = 'active'
    FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property sprint task is unavailable or no longer current'
      USING ERRCODE = '23505';
  END IF;

  -- Lock the property before its task to match property-refresh lock ordering.
  SELECT task.* INTO source_task
    FROM public.sprint_backlog_items AS task
    WHERE task.id = source_task_id AND task.owner_id = p_actor_id
      AND task.source_type = 'property_shortlist'
      AND task.status IN ('open', 'in_progress')
    FOR UPDATE;
  IF NOT FOUND OR source_task.property_id IS DISTINCT FROM property_id
      OR source_task.input_revision IS NULL OR source_property.revision <> source_task.input_revision THEN
    RAISE EXCEPTION 'Property sprint task is stale; refresh its property work first'
      USING ERRCODE = '23505';
  END IF;

  UPDATE public.realtor_planner_items AS planner
    SET source_sprint_task_id = source_task_id
    WHERE planner.id = saved_id AND planner.user_id = p_actor_id
      AND planner.workspace_id = p_workspace_id
      AND planner.source_sprint_task_id IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property sprint task was already scheduled'
      USING ERRCODE = '23505';
  END IF;

  RETURN QUERY SELECT saved_id, saved_revision, was_reused;
END;
$$;

REVOKE ALL ON FUNCTION public.realtor_save_planner_item_without_task_identity(UUID,UUID,UUID,INTEGER,UUID,JSONB,JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.realtor_save_planner_item_without_task_identity(UUID,UUID,UUID,INTEGER,UUID,JSONB,JSONB)
  TO service_role;
REVOKE ALL ON FUNCTION public.realtor_save_planner_item(UUID,UUID,UUID,INTEGER,UUID,JSONB,JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.realtor_save_planner_item(UUID,UUID,UUID,INTEGER,UUID,JSONB,JSONB)
  TO service_role;
