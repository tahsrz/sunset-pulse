-- Preserve ledger history when entries are corrected, voided, or realized.

-- A voided payment remains in history, but must not prevent a replacement
-- payment for the reopened bill. Concurrent active payments remain unique.
ALTER TABLE public.realtor_financial_records DROP CONSTRAINT realtor_financial_records_occurrence_id_key;
CREATE UNIQUE INDEX realtor_financial_active_occurrence_idx
ON public.realtor_financial_records(occurrence_id) WHERE status = 'active' AND occurrence_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.realtor_prevent_terminal_financial_reactivation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status <> 'active' AND NEW.status = 'active' THEN
    RAISE EXCEPTION 'A voided or realized financial record cannot be reactivated.' USING ERRCODE = '40001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER realtor_financial_terminal_status_guard
BEFORE UPDATE OF status ON public.realtor_financial_records
FOR EACH ROW EXECUTE FUNCTION public.realtor_prevent_terminal_financial_reactivation();

CREATE OR REPLACE FUNCTION public.realtor_correct_financial_record(
  p_actor_id UUID,
  p_workspace_id UUID,
  p_record_id UUID,
  p_expected_revision INTEGER,
  p_request_key UUID,
  p_kind TEXT,
  p_effective_date DATE,
  p_data JSONB
)
RETURNS TABLE(record_id UUID, revision INTEGER, reused BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  record_row public.realtor_financial_records%ROWTYPE;
  receipt public.realtor_mutation_receipts%ROWTYPE;
  saved RECORD;
  request_hash TEXT;
  internal_request_key UUID := gen_random_uuid();
BEGIN
  IF NOT public.realtor_personal_access(p_actor_id, p_workspace_id) THEN
    RAISE EXCEPTION 'Personal financial access denied' USING ERRCODE = '42501';
  END IF;
  IF p_record_id IS NULL OR p_expected_revision IS NULL OR p_request_key IS NULL
    OR p_kind NOT IN ('commission', 'expense', 'expected_commission')
    OR p_effective_date IS NULL OR p_data IS NULL OR jsonb_typeof(p_data) <> 'object' THEN
    RAISE EXCEPTION 'Invalid financial correction' USING ERRCODE = '22023';
  END IF;
  request_hash := encode(digest(jsonb_build_object(
    'recordId', p_record_id, 'revision', p_expected_revision, 'kind', p_kind,
    'date', p_effective_date, 'data', p_data
  )::TEXT, 'sha256'), 'hex');
  SELECT * INTO receipt FROM public.realtor_mutation_receipts
  WHERE actor_id = p_actor_id AND request_key = p_request_key;
  IF FOUND THEN
    IF receipt.operation <> 'financial_correct' OR receipt.input_hash <> request_hash THEN
      RAISE EXCEPTION 'Request key conflict' USING ERRCODE = '23505';
    END IF;
    RETURN QUERY SELECT receipt.resource_id, receipt.resource_revision, true;
    RETURN;
  END IF;

  SELECT * INTO record_row FROM public.realtor_financial_records r
  WHERE r.id = p_record_id AND r.user_id = p_actor_id AND r.workspace_id = p_workspace_id
    AND r.kind = p_kind
  FOR UPDATE;
  IF NOT FOUND OR record_row.status <> 'active' OR record_row.current_revision <> p_expected_revision THEN
    RAISE EXCEPTION 'Financial record changed or is not correctable' USING ERRCODE = '40001';
  END IF;

  SELECT * INTO saved FROM public.realtor_save_financial_record(
    p_actor_id, p_workspace_id, p_record_id, p_expected_revision, internal_request_key,
    p_kind, p_effective_date, p_data, NULL, NULL
  );
  INSERT INTO public.realtor_mutation_receipts(
    actor_id, request_key, operation, input_hash, resource_id, resource_revision, response
  ) VALUES (
    p_actor_id, p_request_key, 'financial_correct', request_hash,
    saved.record_id, saved.revision, jsonb_build_object('recordId', saved.record_id)
  );
  INSERT INTO public.platform_audit_events(workspace_id, actor_id, actor_kind, action, resource_type, resource_id, safe_metadata)
  VALUES (p_workspace_id, p_actor_id, 'user', 'realtor.financial.correct', 'realtor_financial_record', saved.record_id::TEXT,
    jsonb_build_object('revision', saved.revision, 'kind', p_kind));
  RETURN QUERY SELECT saved.record_id, saved.revision, false;
END;
$$;

CREATE OR REPLACE FUNCTION public.realtor_void_financial_record(
  p_actor_id UUID,
  p_workspace_id UUID,
  p_record_id UUID,
  p_expected_revision INTEGER,
  p_request_key UUID
)
RETURNS TABLE(record_id UUID, revision INTEGER, status TEXT, reused BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  record_row public.realtor_financial_records%ROWTYPE;
  revision_row public.realtor_financial_revisions%ROWTYPE;
  occurrence_row public.realtor_planner_occurrences%ROWTYPE;
  item_row public.realtor_planner_items%ROWTYPE;
  reminder_offset INTEGER;
  next_revision INTEGER;
  request_hash TEXT;
  receipt public.realtor_mutation_receipts%ROWTYPE;
  zone TEXT;
BEGIN
  IF NOT public.realtor_personal_access(p_actor_id, p_workspace_id) THEN
    RAISE EXCEPTION 'Personal financial access denied' USING ERRCODE = '42501';
  END IF;
  IF p_record_id IS NULL OR p_expected_revision IS NULL OR p_request_key IS NULL THEN
    RAISE EXCEPTION 'Invalid financial void request' USING ERRCODE = '22023';
  END IF;
  request_hash := encode(digest(jsonb_build_object('recordId', p_record_id, 'revision', p_expected_revision, 'action', 'void')::TEXT, 'sha256'), 'hex');
  SELECT * INTO receipt FROM public.realtor_mutation_receipts
  WHERE actor_id = p_actor_id AND request_key = p_request_key;
  IF FOUND THEN
    IF receipt.operation <> 'financial_void' OR receipt.input_hash <> request_hash THEN
      RAISE EXCEPTION 'Request key conflict' USING ERRCODE = '23505';
    END IF;
    RETURN QUERY SELECT receipt.resource_id, receipt.resource_revision, receipt.response->>'status', true;
    RETURN;
  END IF;

  SELECT * INTO record_row FROM public.realtor_financial_records r
  WHERE r.id = p_record_id AND r.user_id = p_actor_id AND r.workspace_id = p_workspace_id
  FOR UPDATE;
  IF NOT FOUND OR record_row.status <> 'active' OR record_row.current_revision <> p_expected_revision THEN
    RAISE EXCEPTION 'Financial record changed' USING ERRCODE = '40001';
  END IF;
  SELECT * INTO revision_row FROM public.realtor_financial_revisions r
  WHERE r.record_id = record_row.id AND r.revision = record_row.current_revision;
  next_revision := record_row.current_revision + 1;

  INSERT INTO public.realtor_financial_revisions(
    record_id, user_id, workspace_id, revision, request_key, input_hash, effective_date, data, actor_id
  ) VALUES (
    record_row.id, p_actor_id, p_workspace_id, next_revision, p_request_key, request_hash,
    revision_row.effective_date, revision_row.data, p_actor_id
  );
  UPDATE public.realtor_financial_records
  SET current_revision = next_revision, status = 'void'
  WHERE id = record_row.id;

  IF record_row.kind = 'expense' AND record_row.occurrence_id IS NOT NULL THEN
    SELECT * INTO occurrence_row FROM public.realtor_planner_occurrences o
    WHERE o.id = record_row.occurrence_id AND o.user_id = p_actor_id AND o.workspace_id = p_workspace_id
    FOR UPDATE;
    IF FOUND AND occurrence_row.status = 'completed' AND occurrence_row.kind_snapshot = 'bill' THEN
      UPDATE public.realtor_reminders AS reminder SET status = 'superseded', revision = reminder.revision + 1, updated_at = now()
      WHERE reminder.occurrence_id = occurrence_row.id AND reminder.status IN ('scheduled', 'visible');
      UPDATE public.realtor_planner_occurrences AS occurrence SET status = 'pending', completed_at = NULL,
        revision = occurrence.revision + 1, updated_at = now()
      WHERE occurrence.id = occurrence_row.id RETURNING occurrence.* INTO occurrence_row;

      SELECT * INTO item_row FROM public.realtor_planner_items i
      WHERE i.id = occurrence_row.item_id AND i.user_id = p_actor_id AND i.workspace_id = p_workspace_id;
      SELECT p.time_zone INTO zone FROM public.realtor_preferences p
      WHERE p.user_id = p_actor_id AND p.workspace_id = p_workspace_id;
      FOR reminder_offset IN
        SELECT value::INTEGER
        FROM jsonb_array_elements_text(COALESCE(item_row.due_spec->'reminderOffsetsDays', '[]'::JSONB))
      LOOP
        IF reminder_offset BETWEEN 0 AND 365 THEN
          INSERT INTO public.realtor_reminders(
            occurrence_id, user_id, workspace_id, occurrence_revision, offset_days, scheduled_at
          ) VALUES (
            occurrence_row.id, p_actor_id, p_workspace_id, occurrence_row.revision, reminder_offset,
            (occurrence_row.effective_date - reminder_offset
              + COALESCE(NULLIF(item_row.due_spec->>'localTime', 'null')::TIME, '09:00'::TIME))
              AT TIME ZONE COALESCE(NULLIF(item_row.due_spec->>'timeZone', ''), zone, 'America/Chicago')
          ) ON CONFLICT ON CONSTRAINT realtor_reminders_occurrence_revision_offset_unique DO NOTHING;
        END IF;
      END LOOP;
    END IF;
  END IF;

  INSERT INTO public.realtor_mutation_receipts(actor_id, request_key, operation, input_hash, resource_id, resource_revision, response)
  VALUES (p_actor_id, p_request_key, 'financial_void', request_hash, record_row.id, next_revision, jsonb_build_object('status', 'void'));
  INSERT INTO public.platform_audit_events(workspace_id, actor_id, actor_kind, action, resource_type, resource_id, safe_metadata)
  VALUES (p_workspace_id, p_actor_id, 'user', 'realtor.financial.void', 'realtor_financial_record', record_row.id::TEXT,
    jsonb_build_object('revision', next_revision, 'kind', record_row.kind, 'occurrenceId', record_row.occurrence_id));
  RETURN QUERY SELECT record_row.id, next_revision, 'void'::TEXT, false;
END;
$$;

CREATE OR REPLACE FUNCTION public.realtor_realize_expected_income(
  p_actor_id UUID,
  p_workspace_id UUID,
  p_expected_record_id UUID,
  p_expected_revision INTEGER,
  p_request_key UUID,
  p_effective_date DATE,
  p_commission_data JSONB
)
RETURNS TABLE(expected_record_id UUID, expected_revision INTEGER, commission_record_id UUID, reused BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expected_row public.realtor_financial_records%ROWTYPE;
  expected_revision_row public.realtor_financial_revisions%ROWTYPE;
  created_record RECORD;
  receipt public.realtor_mutation_receipts%ROWTYPE;
  request_hash TEXT;
  next_revision INTEGER;
  internal_request_key UUID := gen_random_uuid();
  realized_id UUID;
BEGIN
  IF NOT public.realtor_personal_access(p_actor_id, p_workspace_id) THEN
    RAISE EXCEPTION 'Personal financial access denied' USING ERRCODE = '42501';
  END IF;
  IF p_expected_record_id IS NULL OR p_expected_revision IS NULL OR p_request_key IS NULL
    OR p_effective_date IS NULL OR p_effective_date > CURRENT_DATE
    OR p_commission_data IS NULL OR jsonb_typeof(p_commission_data) <> 'object' THEN
    RAISE EXCEPTION 'Invalid expected income realization' USING ERRCODE = '22023';
  END IF;
  request_hash := encode(digest(jsonb_build_object(
    'expectedRecordId', p_expected_record_id, 'expectedRevision', p_expected_revision,
    'effectiveDate', p_effective_date, 'commission', p_commission_data
  )::TEXT, 'sha256'), 'hex');
  SELECT * INTO receipt FROM public.realtor_mutation_receipts
  WHERE actor_id = p_actor_id AND request_key = p_request_key;
  IF FOUND THEN
    IF receipt.operation <> 'financial_realize' OR receipt.input_hash <> request_hash THEN
      RAISE EXCEPTION 'Request key conflict' USING ERRCODE = '23505';
    END IF;
    RETURN QUERY SELECT receipt.resource_id, receipt.resource_revision,
      (receipt.response->>'commissionRecordId')::UUID, true;
    RETURN;
  END IF;

  SELECT * INTO expected_row FROM public.realtor_financial_records r
  WHERE r.id = p_expected_record_id AND r.user_id = p_actor_id AND r.workspace_id = p_workspace_id
    AND r.kind = 'expected_commission'
  FOR UPDATE;
  IF NOT FOUND OR expected_row.status <> 'active' OR expected_row.current_revision <> p_expected_revision THEN
    RAISE EXCEPTION 'Expected income changed or was already realized' USING ERRCODE = '40001';
  END IF;
  SELECT * INTO expected_revision_row FROM public.realtor_financial_revisions r
  WHERE r.record_id = expected_row.id AND r.revision = expected_row.current_revision;

  SELECT * INTO created_record FROM public.realtor_save_financial_record(
    p_actor_id, p_workspace_id, NULL, NULL, internal_request_key, 'commission',
    p_effective_date, p_commission_data, NULL, NULL
  );
  realized_id := created_record.record_id;
  next_revision := expected_row.current_revision + 1;
  INSERT INTO public.realtor_financial_revisions(
    record_id, user_id, workspace_id, revision, request_key, input_hash, effective_date, data, actor_id
  ) VALUES (
    expected_row.id, p_actor_id, p_workspace_id, next_revision, p_request_key, request_hash,
    expected_revision_row.effective_date, expected_revision_row.data, p_actor_id
  );
  UPDATE public.realtor_financial_records
  SET current_revision = next_revision, status = 'realized', realized_by_record_id = realized_id
  WHERE id = expected_row.id;

  INSERT INTO public.realtor_mutation_receipts(actor_id, request_key, operation, input_hash, resource_id, resource_revision, response)
  VALUES (p_actor_id, p_request_key, 'financial_realize', request_hash, expected_row.id, next_revision,
    jsonb_build_object('commissionRecordId', realized_id));
  INSERT INTO public.platform_audit_events(workspace_id, actor_id, actor_kind, action, resource_type, resource_id, safe_metadata)
  VALUES (p_workspace_id, p_actor_id, 'user', 'realtor.financial.realize', 'realtor_financial_record', expected_row.id::TEXT,
    jsonb_build_object('revision', next_revision, 'commissionRecordId', realized_id));
  RETURN QUERY SELECT expected_row.id, next_revision, realized_id, false;
END;
$$;

REVOKE ALL ON FUNCTION public.realtor_prevent_terminal_financial_reactivation() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.realtor_correct_financial_record(UUID, UUID, UUID, INTEGER, UUID, TEXT, DATE, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.realtor_void_financial_record(UUID, UUID, UUID, INTEGER, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.realtor_realize_expected_income(UUID, UUID, UUID, INTEGER, UUID, DATE, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.realtor_void_financial_record(UUID, UUID, UUID, INTEGER, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.realtor_correct_financial_record(UUID, UUID, UUID, INTEGER, UUID, TEXT, DATE, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.realtor_realize_expected_income(UUID, UUID, UUID, INTEGER, UUID, DATE, JSONB) TO service_role;
