-- Materialize a reviewed, server-projected occurrence on demand. GET endpoints
-- remain read-only; this RPC is reached only by an authenticated POST action.

CREATE OR REPLACE FUNCTION public.realtor_materialize_planner_occurrence(
  p_actor_id UUID,p_workspace_id UUID,p_item_id UUID,p_expected_item_revision INTEGER,
  p_request_key UUID,p_original_date DATE,p_reminders JSONB
) RETURNS TABLE(occurrence_id UUID,revision INTEGER,status TEXT,reused BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE item public.realtor_planner_items%ROWTYPE; occurrence public.realtor_planner_occurrences%ROWTYPE;
  receipt public.realtor_mutation_receipts%ROWTYPE; reminder JSONB; input_hash TEXT; inserted_id UUID;
BEGIN
  IF NOT public.realtor_personal_access(p_actor_id,p_workspace_id) THEN
    RAISE EXCEPTION 'Personal planner access denied' USING ERRCODE='42501';
  END IF;
  IF p_request_key IS NULL OR p_original_date IS NULL OR p_reminders IS NULL OR jsonb_typeof(p_reminders)<>'array'
    OR jsonb_array_length(p_reminders)>3 THEN RAISE EXCEPTION 'Invalid occurrence request' USING ERRCODE='22023'; END IF;
  input_hash:=encode(digest(jsonb_build_object('workspace',p_workspace_id,'item',p_item_id,
    'revision',p_expected_item_revision,'date',p_original_date,'reminders',p_reminders)::text,'sha256'),'hex');
  SELECT * INTO receipt FROM public.realtor_mutation_receipts WHERE actor_id=p_actor_id AND request_key=p_request_key;
  IF FOUND THEN
    IF receipt.operation<>'planner_materialize' OR receipt.input_hash<>input_hash THEN
      RAISE EXCEPTION 'Request key conflict' USING ERRCODE='23505';
    END IF;
    RETURN QUERY SELECT receipt.resource_id,receipt.resource_revision,receipt.response->>'status',TRUE;
    RETURN;
  END IF;
  SELECT * INTO item FROM public.realtor_planner_items i
    WHERE i.id=p_item_id AND i.user_id=p_actor_id AND i.workspace_id=p_workspace_id AND i.status='active' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Planner item not found' USING ERRCODE='P0002'; END IF;
  IF item.revision<>p_expected_item_revision THEN RAISE EXCEPTION 'Planner item changed' USING ERRCODE='40001'; END IF;
  INSERT INTO public.realtor_planner_occurrences(item_id,user_id,workspace_id,occurrence_key,original_date,effective_date,
    effective_time,item_revision,title_snapshot,kind_snapshot,expected_amount_cents)
  VALUES(item.id,p_actor_id,p_workspace_id,item.id::TEXT||':'||p_original_date::TEXT,p_original_date,p_original_date,
    NULLIF(item.due_spec#>>'{localTime}','null')::TIME,item.revision,item.title,item.kind,item.expected_amount_cents)
  ON CONFLICT(item_id,occurrence_key) DO NOTHING RETURNING id INTO inserted_id;
  IF inserted_id IS NULL THEN
    SELECT * INTO occurrence FROM public.realtor_planner_occurrences o
      WHERE o.item_id=item.id AND o.occurrence_key=item.id::TEXT||':'||p_original_date::TEXT FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Occurrence materialization failed' USING ERRCODE='40001'; END IF;
  ELSE
    SELECT * INTO occurrence FROM public.realtor_planner_occurrences o WHERE o.id=inserted_id FOR UPDATE;
    FOR reminder IN SELECT value FROM jsonb_array_elements(p_reminders) LOOP
      IF (reminder->>'offsetDays')::INTEGER NOT BETWEEN 0 AND 365
        OR (reminder->>'scheduledAt')::TIMESTAMPTZ IS NULL THEN
        RAISE EXCEPTION 'Invalid reminder candidate' USING ERRCODE='22023';
      END IF;
      INSERT INTO public.realtor_reminders(occurrence_id,user_id,workspace_id,occurrence_revision,offset_days,scheduled_at)
      VALUES(occurrence.id,p_actor_id,p_workspace_id,occurrence.revision,(reminder->>'offsetDays')::INTEGER,
        (reminder->>'scheduledAt')::TIMESTAMPTZ)
      ON CONFLICT ON CONSTRAINT realtor_reminders_occurrence_revision_offset_unique DO NOTHING;
    END LOOP;
    UPDATE public.realtor_planner_items SET materialized_through=GREATEST(COALESCE(materialized_through,p_original_date),p_original_date)
      WHERE id=item.id;
    INSERT INTO public.platform_audit_events(workspace_id,actor_id,actor_kind,action,resource_type,resource_id,safe_metadata)
      VALUES(p_workspace_id,p_actor_id,'user','realtor.occurrence.materialized','realtor_occurrence',occurrence.id::TEXT,
        jsonb_build_object('itemRevision',item.revision,'occurrenceDate',p_original_date));
  END IF;
  INSERT INTO public.realtor_mutation_receipts(actor_id,request_key,operation,input_hash,resource_id,resource_revision,response)
    VALUES(p_actor_id,p_request_key,'planner_materialize',input_hash,occurrence.id,occurrence.revision,
      jsonb_build_object('status',occurrence.status));
  RETURN QUERY SELECT occurrence.id,occurrence.revision,occurrence.status,FALSE;
END $$;

REVOKE ALL ON FUNCTION public.realtor_materialize_planner_occurrence(UUID,UUID,UUID,INTEGER,UUID,DATE,JSONB) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.realtor_materialize_planner_occurrence(UUID,UUID,UUID,INTEGER,UUID,DATE,JSONB) TO service_role;
