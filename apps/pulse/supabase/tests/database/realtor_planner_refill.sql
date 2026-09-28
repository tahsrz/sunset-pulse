BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(13);

CREATE TEMP TABLE realtor_planner_refill_assertions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  passed BOOLEAN NOT NULL,
  description TEXT NOT NULL
);
CREATE FUNCTION pg_temp.record_realtor_refill_assertion(p_passed BOOLEAN, p_description TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO pg_temp.realtor_planner_refill_assertions(passed, description)
  VALUES (p_passed, p_description);
END;
$$;

DO $$
DECLARE
  actor_id UUID := gen_random_uuid();
  v_workspace_id UUID := gen_random_uuid();
  schedule_id UUID;
  schedule_revision INTEGER;
  v_job_id UUID := gen_random_uuid();
  lease UUID := gen_random_uuid();
  coverage DATE := CURRENT_DATE + 30;
  from_date DATE := CURRENT_DATE;
  candidates JSONB;
  batch RECORD;
BEGIN
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  INSERT INTO auth.users(id, email) VALUES (actor_id, 'refill-test@example.test'::text);
  SELECT created.workspace_id INTO v_workspace_id
  FROM public.platform_create_workspace_with_owner(actor_id, v_workspace_id, 'personal', 'Refill acceptance') AS created;
  INSERT INTO public.realtor_preferences(user_id, workspace_id)
  VALUES (actor_id, v_workspace_id);

  FOR item_number IN 1..26 LOOP
    INSERT INTO public.realtor_planner_items(user_id, workspace_id, kind, title, due_spec)
    VALUES (actor_id, v_workspace_id, 'task', 'Refill fixture ' || item_number,
      jsonb_build_object('anchorDate', CURRENT_DATE, 'localTime', NULL, 'timeZone', 'America/Chicago',
        'recurrence', jsonb_build_object('frequency', 'once'), 'endsOn', NULL, 'reminderOffsetsDays', '[]'::JSONB));
  END LOOP;

  SELECT id INTO schedule_id FROM public.workflow_schedules
  WHERE user_id = actor_id AND workflow_key = 'realtor_planner';
  PERFORM pg_temp.record_realtor_refill_assertion(schedule_id IS NOT NULL AND (SELECT enabled AND cadence = 'daily'
    FROM public.workflow_schedules WHERE id = schedule_id), 'first active item creates one daily enabled planner schedule'::text);
  PERFORM pg_temp.record_realtor_refill_assertion((SELECT time_zone = 'America/Chicago' AND local_hour = 3 AND local_minute = 0
    FROM public.workflow_schedules WHERE id = schedule_id), 'daily refill runs at 03:00 in the owner''s timezone'::text);

  SELECT revision INTO schedule_revision FROM public.workflow_schedules WHERE id = schedule_id;
  UPDATE public.realtor_preferences SET time_zone = 'America/Denver'
  WHERE user_id = actor_id AND workspace_id = v_workspace_id;
  PERFORM pg_temp.record_realtor_refill_assertion((SELECT time_zone = 'America/Denver' AND revision = schedule_revision + 1
      AND next_run_at <= clock_timestamp() FROM public.workflow_schedules WHERE id = schedule_id),
    'timezone changes advance the schedule revision and make the next run immediately eligible'::text);

  INSERT INTO public.workflow_jobs(id, schedule_id, user_id, workflow_key, scheduled_for, status,
    lease_until, lease_token, trigger_kind)
  VALUES (v_job_id, schedule_id, actor_id, 'realtor_planner', clock_timestamp(), 'running',
    clock_timestamp() + INTERVAL '2 minutes', lease, 'scheduled'::text);

  SELECT jsonb_agg(jsonb_build_object('itemId', batch_items.id, 'workspaceId', v_workspace_id,
    'itemRevision', batch_items.revision, 'fromDate', from_date, 'throughDate', coverage, 'occurrences', '[]'::JSONB)
    ORDER BY batch_items.id)
  INTO candidates
  FROM (SELECT id, revision FROM public.realtor_planner_items
    WHERE user_id = actor_id AND workspace_id = v_workspace_id AND status = 'active'
    ORDER BY id LIMIT 25) AS batch_items;
  SELECT * INTO batch FROM public.realtor_commit_planner_refill_batch(v_job_id, lease, coverage, candidates);
  PERFORM pg_temp.record_realtor_refill_assertion(NOT batch.committed AND batch.result_status = 'batch_committed' AND batch.inserted_occurrences = 0,
    'first bounded batch commits its 25-item cursor and defers remaining work'::text);
  PERFORM pg_temp.record_realtor_refill_assertion((SELECT count(*) = 25 FROM public.realtor_planner_items
    WHERE user_id = actor_id AND workspace_id = v_workspace_id AND refill_coverage_through = coverage),
    'first batch advances coverage for exactly 25 planner items'::text);
  PERFORM pg_temp.record_realtor_refill_assertion((SELECT status = 'running' AND lease_token = lease FROM public.workflow_jobs WHERE id = v_job_id),
    'non-final batch preserves the active scheduler lease'::text);

  SELECT jsonb_agg(jsonb_build_object('itemId', remaining.id, 'workspaceId', v_workspace_id,
    'itemRevision', remaining.revision, 'fromDate', from_date, 'throughDate', coverage, 'occurrences', '[]'::JSONB)
    ORDER BY remaining.id)
  INTO candidates
  FROM public.realtor_planner_items AS remaining
  WHERE remaining.user_id = actor_id AND remaining.workspace_id = v_workspace_id AND remaining.status = 'active'
    AND remaining.refill_coverage_through IS NULL;
  INSERT INTO public.realtor_planner_items(user_id, workspace_id, kind, title, due_spec)
  VALUES(actor_id, v_workspace_id, 'task', 'Future-only fixture', jsonb_build_object('anchorDate', CURRENT_DATE + 180,
    'localTime', NULL, 'timeZone', 'America/Chicago', 'recurrence', jsonb_build_object('frequency','once'), 'endsOn', NULL, 'reminderOffsetsDays','[]'::jsonb));
  SELECT * INTO batch FROM public.realtor_commit_planner_refill_batch(v_job_id, lease, coverage, candidates);
  PERFORM pg_temp.record_realtor_refill_assertion(batch.committed AND batch.result_status = 'completed' AND batch.inserted_occurrences = 0,
    'final bounded batch commits and completes the refill job'::text);
  PERFORM pg_temp.record_realtor_refill_assertion((SELECT count(*) = 26 FROM public.realtor_planner_items
    WHERE user_id = actor_id AND workspace_id = v_workspace_id AND refill_coverage_through = coverage),
    'final batch closes the coverage gap for all 26 items'::text);
  PERFORM pg_temp.record_realtor_refill_assertion((SELECT status = 'completed' AND lease_token IS NULL AND lease_until IS NULL
    FROM public.workflow_jobs WHERE id = v_job_id), 'final batch clears the lease and marks its job complete'::text);
  PERFORM pg_temp.record_realtor_refill_assertion((SELECT count(*) = 1 FROM public.workflow_results AS result WHERE result.job_id = v_job_id
    AND result.workflow_key = 'realtor_planner' AND result.result_type = 'realtor_planner_refill'),
    'final batch writes exactly one durable scheduler result'::text);
  PERFORM pg_temp.record_realtor_refill_assertion((SELECT count(*) = 0 FROM public.realtor_planner_occurrences
    WHERE user_id = actor_id AND workspace_id = v_workspace_id),
    'refill coverage does not create unrelated occurrences for one-time items outside the candidate window'::text);
  PERFORM pg_temp.record_realtor_refill_assertion((SELECT refill_coverage_through IS NULL FROM public.realtor_planner_items
    WHERE user_id=actor_id AND title='Future-only fixture'), 'future-only items do not keep a completed refill job deferring'::text);
  UPDATE public.realtor_planner_items SET due_spec=jsonb_set(due_spec,'{localTime}','"10:00"'::jsonb)
    WHERE user_id=actor_id AND refill_coverage_through=coverage;
  PERFORM pg_temp.record_realtor_refill_assertion((SELECT count(*)=0 FROM public.realtor_planner_items
    WHERE user_id=actor_id AND refill_coverage_through IS NOT NULL), 'changing recurrence resets contiguous refill coverage'::text);
END;
$$;

SELECT ok(passed, description)
FROM pg_temp.realtor_planner_refill_assertions
ORDER BY id;
SELECT * FROM finish();
ROLLBACK;
