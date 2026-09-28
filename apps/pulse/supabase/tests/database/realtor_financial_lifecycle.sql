BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(22);

DO $$
DECLARE
  actor_id UUID := gen_random_uuid();
  workspace_id UUID := gen_random_uuid();
  commission_key UUID := gen_random_uuid();
  expected_key UUID := gen_random_uuid();
  realization_key UUID := gen_random_uuid();
  bill_key UUID := gen_random_uuid();
  payment_key UUID := gen_random_uuid();
  correction_key UUID := gen_random_uuid();
  void_key UUID := gen_random_uuid();
  bill_item_id UUID;
  bill_occurrence_id UUID;
  commission_id UUID;
  expected_id UUID;
  realized_commission_id UUID;
  expense_id UUID;
  replay_id UUID;
  revision_number INTEGER;
  reused BOOLEAN;
  result_status TEXT;
  due_date DATE := CURRENT_DATE + 5;
  current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  summary JSONB;
  caught_state TEXT;
  commission_data JSONB := '{"mode":"gross","grossCents":100000,"withheldCents":10000,"closingReference":"commission-close-1"}'::JSONB;
  realized_data JSONB := '{"mode":"gross","grossCents":200000,"withheldCents":20000,"closingReference":"expected-close-1"}'::JSONB;
  bill_definition JSONB;
  candidates JSONB;
BEGIN
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  INSERT INTO auth.users(id, email) VALUES (actor_id, 'financial-test@example.test'::text);
  SELECT created.workspace_id INTO workspace_id
  FROM public.platform_create_workspace_with_owner(actor_id, workspace_id, 'personal', 'Financial acceptance') AS created;
  INSERT INTO public.realtor_preferences(user_id, workspace_id, reminders_enabled)
  VALUES (actor_id, workspace_id, true);

  SELECT saved.record_id, saved.revision, saved.reused INTO commission_id, revision_number, reused
  FROM public.realtor_save_financial_record(actor_id, workspace_id, NULL, NULL, commission_key,
    'commission', CURRENT_DATE, commission_data, NULL, NULL) AS saved;
  PERFORM ok(revision_number = 1 AND NOT reused, 'commission creation returns first revision'::text);

  SELECT saved.record_id, saved.reused INTO replay_id, reused
  FROM public.realtor_save_financial_record(actor_id, workspace_id, NULL, NULL, commission_key,
    'commission', CURRENT_DATE, commission_data, NULL, NULL) AS saved;
  PERFORM ok(replay_id = commission_id AND reused, 'same commission request key replays without a duplicate'::text);

  caught_state := NULL;
  BEGIN
    PERFORM * FROM public.realtor_save_financial_record(actor_id, workspace_id, NULL, NULL, commission_key,
      'commission', CURRENT_DATE, '{"mode":"gross","grossCents":100100,"withheldCents":10000,"closingReference":"commission-close-1"}'::JSONB,
      NULL, NULL);
  EXCEPTION WHEN OTHERS THEN caught_state := SQLSTATE;
  END;
  PERFORM ok(caught_state = '23505', 'changed commission payload conflicts with the original request key'::text);

  summary := public.realtor_read_business_summary(actor_id, workspace_id, current_year);
  PERFORM ok(summary->>'receivedCents' = '90000' AND summary->>'recordedNetCents' = '90000',
    'gross commission totals subtract withheld funds once'::text);

  SELECT saved.record_id INTO expected_id
  FROM public.realtor_save_financial_record(actor_id, workspace_id, NULL, NULL, expected_key,
    'expected_commission', CURRENT_DATE, '{"estimatedTakeHomeCents":200000}'::JSONB, NULL, NULL) AS saved;
  summary := public.realtor_read_business_summary(actor_id, workspace_id, current_year);
  PERFORM ok(summary->>'pendingIncomeCents' = '200000' AND summary->>'receivedCents' = '90000',
    'expected income is excluded from received totals'::text);

  SELECT realized.commission_record_id, realized.expected_revision, realized.reused
    INTO realized_commission_id, revision_number, reused
  FROM public.realtor_realize_expected_income(actor_id, workspace_id, expected_id, 1, realization_key,
    CURRENT_DATE, realized_data) AS realized;
  PERFORM ok(revision_number = 2 AND NOT reused AND realized_commission_id IS NOT NULL,
    'realizing expected income appends its terminal revision and creates a commission'::text);

  SELECT realized.commission_record_id, realized.reused INTO replay_id, reused
  FROM public.realtor_realize_expected_income(actor_id, workspace_id, expected_id, 1, realization_key,
    CURRENT_DATE, realized_data) AS realized;
  PERFORM ok(replay_id = realized_commission_id AND reused
    AND (SELECT status = 'realized' AND realized_by_record_id = realized_commission_id
      FROM public.realtor_financial_records WHERE id = expected_id),
    'income realization replay links exactly one received commission'::text);

  bill_definition := jsonb_build_object(
    'kind', 'bill', 'title', 'Broker dues', 'notes', '', 'expectedAmountCents', 15000,
    'property', NULL, 'sourceSprintTaskId', NULL,
    'due', jsonb_build_object('anchorDate', due_date, 'localTime', '09:00', 'timeZone', 'America/Chicago',
      'recurrence', jsonb_build_object('frequency', 'once'), 'endsOn', NULL, 'reminderOffsetsDays', '[1]'::JSONB)
  );
  candidates := jsonb_build_array(jsonb_build_object(
    'occurrenceKeyDate', due_date, 'effectiveDate', due_date,
    'reminders', jsonb_build_array(jsonb_build_object('offsetDays', 1,
      'scheduledAt', ((due_date - 1) + TIME '09:00') AT TIME ZONE 'America/Chicago'))
  ));
  SELECT saved.item_id INTO bill_item_id
  FROM public.realtor_save_planner_item(actor_id, workspace_id, NULL, NULL, gen_random_uuid(), bill_definition, candidates) AS saved;
  SELECT id INTO bill_occurrence_id FROM public.realtor_planner_occurrences WHERE item_id = bill_item_id;
  PERFORM ok(bill_occurrence_id IS NOT NULL AND (SELECT count(*) = 1 FROM public.realtor_reminders WHERE occurrence_id = bill_occurrence_id AND status = 'scheduled'),
    'bill materialization creates one pending reminder'::text);

  SELECT saved.record_id, saved.revision INTO expense_id, revision_number
  FROM public.realtor_save_financial_record(actor_id, workspace_id, NULL, NULL, payment_key,
    'expense', CURRENT_DATE, '{"amountCents":15000,"category":"broker_dues"}'::JSONB,
    bill_occurrence_id, 1) AS saved;
  PERFORM ok(revision_number = 1 AND (SELECT status = 'completed' AND revision = 2 FROM public.realtor_planner_occurrences WHERE id = bill_occurrence_id),
    'bill payment creates one expense and completes its occurrence'::text);
  PERFORM ok((SELECT status = 'superseded' FROM public.realtor_reminders WHERE occurrence_id = bill_occurrence_id AND occurrence_revision = 1),
    'payment supersedes the prior reminder revision'::text);

  SELECT saved.record_id, saved.reused INTO replay_id, reused
  FROM public.realtor_save_financial_record(actor_id, workspace_id, NULL, NULL, payment_key,
    'expense', CURRENT_DATE, '{"amountCents":15000,"category":"broker_dues"}'::JSONB,
    bill_occurrence_id, 1) AS saved;
  PERFORM ok(replay_id = expense_id AND reused AND
    (SELECT count(*) = 1 FROM public.realtor_financial_records WHERE occurrence_id = bill_occurrence_id),
    'replayed bill-payment request does not duplicate the expense'::text);

  SELECT corrected.revision, corrected.reused INTO revision_number, reused
  FROM public.realtor_correct_financial_record(actor_id, workspace_id, expense_id, 1, correction_key,
    'expense', make_date(current_year, 1, 2), '{"amountCents":12000,"category":"broker_dues"}'::JSONB) AS corrected;
  PERFORM ok(revision_number = 2 AND NOT reused, 'correction appends a revision'::text);
  PERFORM ok((SELECT count(*) = 2 AND min(effective_date) < max(effective_date)
    FROM public.realtor_financial_revisions WHERE record_id = expense_id),
    'correction preserves the prior amount/date revision'::text);
  summary := public.realtor_read_business_summary(actor_id, workspace_id, current_year);
  PERFORM ok(summary->>'paidExpensesCents' = '12000' AND summary->>'recordedNetCents' = '258000',
    'yearly summary uses the corrected current revision and corrected date'::text);

  caught_state := NULL;
  BEGIN
    PERFORM * FROM public.realtor_correct_financial_record(actor_id, workspace_id, expense_id, 1, gen_random_uuid(),
      'expense', CURRENT_DATE, '{"amountCents":11000,"category":"broker_dues"}'::JSONB);
  EXCEPTION WHEN OTHERS THEN caught_state := SQLSTATE;
  END;
  PERFORM ok(caught_state = '40001', 'stale financial correction is rejected'::text);

  SELECT voided.revision, voided.status, voided.reused INTO revision_number, result_status, reused
  FROM public.realtor_void_financial_record(actor_id, workspace_id, expense_id, 2, void_key) AS voided;
  PERFORM ok(revision_number = 3 AND result_status = 'void' AND NOT reused,
    'void appends a terminal financial revision'::text);
  summary := public.realtor_read_business_summary(actor_id, workspace_id, current_year);
  PERFORM ok(summary->>'paidExpensesCents' = '0' AND summary->>'recordedNetCents' = '270000',
    'void expense is excluded from yearly totals'::text);
  PERFORM ok((SELECT status = 'pending' AND completed_at IS NULL AND revision = 3
    FROM public.realtor_planner_occurrences WHERE id = bill_occurrence_id),
    'voiding bill payment reopens the linked occurrence'::text);
  PERFORM ok((SELECT count(*) = 1 FROM public.realtor_reminders
    WHERE occurrence_id = bill_occurrence_id AND occurrence_revision = 3 AND status = 'scheduled'),
    'reopened bill receives one reminder at the new occurrence revision'::text);

  SELECT voided.revision, voided.reused INTO revision_number, reused
  FROM public.realtor_void_financial_record(actor_id, workspace_id, expense_id, 2, void_key) AS voided;
  PERFORM ok(revision_number = 3 AND reused, 'same void key replays the terminal result'::text);

  caught_state := NULL;
  BEGIN
    UPDATE public.realtor_financial_records SET status = 'active' WHERE id = expense_id;
  EXCEPTION WHEN OTHERS THEN caught_state := SQLSTATE;
  END;
  PERFORM ok(caught_state = '40001', 'terminal financial record cannot be reactivated'::text);
  PERFORM * FROM public.realtor_save_financial_record(actor_id, workspace_id, NULL, NULL, gen_random_uuid(),
    'expense', CURRENT_DATE, '{"amountCents":15000,"category":"broker_dues"}'::JSONB, bill_occurrence_id, 3);
  PERFORM ok((SELECT count(*) = 2 AND count(*) FILTER (WHERE status='active') = 1
    FROM public.realtor_financial_records WHERE occurrence_id=bill_occurrence_id),
    'reopened bill accepts one replacement payment while preserving its voided payment'::text);
END;
$$;

SELECT * FROM finish();
ROLLBACK;
