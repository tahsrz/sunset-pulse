BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

-- Scheduler acceptance tests run against the migrated local database. Fixtures
-- use replication mode only to avoid coupling the test to auth.users' local
-- seed shape; all scheduler ownership assertions still use distinct UUIDs.
SET LOCAL session_replication_role = replica;

SELECT plan(44);

SELECT has_function(
  'public',
  'dispatch_due_workflow_schedule',
  ARRAY['uuid', 'timestamp with time zone', 'integer', 'timestamp with time zone', 'timestamp with time zone']
);
SELECT has_function('public', 'claim_workflow_jobs', ARRAY['integer', 'integer']);
SELECT has_function('public', 'complete_workflow_job_with_result', ARRAY['uuid', 'uuid', 'text', 'uuid', 'uuid']);
SELECT has_function('public', 'resolve_workflow_failure', ARRAY['uuid', 'uuid', 'text']);
SELECT has_function('public', 'save_sprint_planner_schedule', ARRAY['uuid', 'integer', 'text', 'text', 'text', 'integer', 'integer', 'integer', 'timestamp with time zone']);
SELECT has_function('public', 'enqueue_workflow_event', ARRAY['uuid', 'text', 'text', 'jsonb', 'integer', 'timestamp with time zone']);

SELECT ok(has_function_privilege('service_role', 'public.claim_workflow_jobs(integer, integer)', 'EXECUTE'), 'service_role can claim workflow jobs');
SELECT ok(NOT has_function_privilege('anon', 'public.claim_workflow_jobs(integer, integer)', 'EXECUTE'), 'anon cannot claim workflow jobs');
SELECT ok(NOT has_function_privilege('authenticated', 'public.claim_workflow_jobs(integer, integer)', 'EXECUTE'), 'authenticated cannot claim workflow jobs');
SELECT ok(has_function_privilege('service_role', 'public.resolve_workflow_failure(uuid, uuid, text)', 'EXECUTE'), 'service_role can resolve workflow failures');
SELECT ok(NOT has_function_privilege('anon', 'public.resolve_workflow_failure(uuid, uuid, text)', 'EXECUTE'), 'anon cannot resolve workflow failures');
SELECT ok(NOT has_function_privilege('authenticated', 'public.resolve_workflow_failure(uuid, uuid, text)', 'EXECUTE'), 'authenticated cannot resolve workflow failures');
SELECT ok(has_function_privilege('service_role', 'public.dispatch_due_workflow_schedule(uuid, timestamp with time zone, integer, timestamp with time zone, timestamp with time zone)', 'EXECUTE'), 'service_role can dispatch workflow schedules');
SELECT ok(NOT has_function_privilege('anon', 'public.dispatch_due_workflow_schedule(uuid, timestamp with time zone, integer, timestamp with time zone, timestamp with time zone)', 'EXECUTE'), 'anon cannot dispatch workflow schedules');
SELECT ok(NOT has_function_privilege('authenticated', 'public.dispatch_due_workflow_schedule(uuid, timestamp with time zone, integer, timestamp with time zone, timestamp with time zone)', 'EXECUTE'), 'authenticated cannot dispatch workflow schedules');
SELECT ok(has_function_privilege('service_role', 'public.complete_workflow_job_with_result(uuid, uuid, text, uuid, uuid)', 'EXECUTE'), 'service_role can complete workflow jobs');
SELECT ok(NOT has_function_privilege('anon', 'public.complete_workflow_job_with_result(uuid, uuid, text, uuid, uuid)', 'EXECUTE'), 'anon cannot complete workflow jobs');
SELECT ok(NOT has_function_privilege('authenticated', 'public.complete_workflow_job_with_result(uuid, uuid, text, uuid, uuid)', 'EXECUTE'), 'authenticated cannot complete workflow jobs');
SELECT ok(has_function_privilege('service_role', 'public.save_sprint_planner_schedule(uuid, integer, text, text, text, integer, integer, integer, timestamp with time zone)', 'EXECUTE'), 'service_role can save sprint schedules');
SELECT ok(NOT has_function_privilege('anon', 'public.save_sprint_planner_schedule(uuid, integer, text, text, text, integer, integer, integer, timestamp with time zone)', 'EXECUTE'), 'anon cannot save sprint schedules');
SELECT ok(NOT has_function_privilege('authenticated', 'public.save_sprint_planner_schedule(uuid, integer, text, text, text, integer, integer, integer, timestamp with time zone)', 'EXECUTE'), 'authenticated cannot save sprint schedules');
SELECT ok(has_function_privilege('service_role', 'public.enqueue_workflow_event(uuid, text, text, jsonb, integer, timestamp with time zone)', 'EXECUTE'), 'service_role can enqueue workflow events');
SELECT ok(NOT has_function_privilege('anon', 'public.enqueue_workflow_event(uuid, text, text, jsonb, integer, timestamp with time zone)', 'EXECUTE'), 'anon cannot enqueue workflow events');

CREATE TEMP TABLE scheduler_observations (
  observation_key TEXT PRIMARY KEY,
  bool_value BOOLEAN,
  int_value INTEGER,
  text_value TEXT,
  timestamp_value TIMESTAMPTZ
);

DO $$
DECLARE
  v_owner_id UUID;
  v_schedule_id UUID;
  v_job_id UUID;
  v_next_at TIMESTAMPTZ;
  v_dispatch_result RECORD;
  v_claimed_job public.workflow_jobs%ROWTYPE;
  v_resolution RECORD;
  v_lease_token UUID;
  v_result_id UUID;
  v_completed BOOLEAN;
  v_attempt INTEGER;
  v_event_job_id UUID;
  v_replayed_event_job_id UUID;
  v_event_at TIMESTAMPTZ;
  v_event_replay_ok BOOLEAN := false;
  v_event_changed_rejected BOOLEAN := false;
  v_event_claimed public.workflow_jobs%ROWTYPE;
  v_saved_schedule public.workflow_schedules%ROWTYPE;
  v_stale_rejected BOOLEAN := false;
BEGIN
  -- Schedule creation returns revision 1. Editing a paused schedule requires
  -- that revision and changes planning settings without re-enabling it.
  v_owner_id := gen_random_uuid();
  SELECT * INTO v_saved_schedule
  FROM public.save_sprint_planner_schedule(
    v_owner_id, NULL, 'property_shortlist', 'weekly', 'America/Chicago',
    8, 30, 1, now() + interval '1 day'
  ) AS saved;
  UPDATE public.workflow_schedules AS schedule
  SET enabled = false
  WHERE schedule.id = v_saved_schedule.id;
  SELECT * INTO v_saved_schedule
  FROM public.save_sprint_planner_schedule(
    v_owner_id, 1, 'manual_backlog', 'daily', 'America/Chicago',
    9, 0, 1, now() + interval '1 day'
  ) AS saved;
  INSERT INTO scheduler_observations (observation_key, bool_value, int_value)
  VALUES ('schedule_paused_update', NOT v_saved_schedule.enabled AND v_saved_schedule.revision = 2, v_saved_schedule.revision);
  BEGIN
    PERFORM public.save_sprint_planner_schedule(
      v_owner_id, 1, 'property_shortlist', 'weekly', 'America/Chicago',
      10, 0, 1, now() + interval '2 days'
    );
  EXCEPTION WHEN OTHERS THEN
    v_stale_rejected := SQLERRM = 'Schedule revision conflict';
  END;
  INSERT INTO scheduler_observations (observation_key, bool_value)
  VALUES ('schedule_stale_rejected', v_stale_rejected);

  -- One due schedule is dispatched once. A second call with the old cursor is
  -- fenced by the schedule cursor/revision and cannot create a duplicate job.
  v_owner_id := gen_random_uuid();
  v_next_at := now() + interval '1 hour';
  INSERT INTO public.workflow_schedules (user_id, workflow_key, planning_mode, enabled, next_run_at, revision)
  VALUES (v_owner_id, 'sprint_planner', 'manual_backlog', true, now() - interval '1 minute', 1)
  RETURNING id, next_run_at INTO v_schedule_id, v_next_at;

  SELECT * INTO v_dispatch_result
  FROM public.dispatch_due_workflow_schedule(v_schedule_id, v_next_at, 1, now() + interval '1 hour', now());
  INSERT INTO scheduler_observations (observation_key, int_value)
  VALUES ('dispatch_inserted', v_dispatch_result.inserted_count);

  SELECT next_run_at INTO v_next_at FROM public.workflow_schedules AS schedule WHERE schedule.id = v_schedule_id;
  SELECT * INTO v_dispatch_result
  FROM public.dispatch_due_workflow_schedule(v_schedule_id, now() - interval '1 minute', 1, now() + interval '2 hours', now());
  INSERT INTO scheduler_observations (observation_key, int_value)
  VALUES ('dispatch_duplicate_job_count', (SELECT count(*)::INTEGER FROM public.workflow_jobs AS job WHERE job.schedule_id = v_schedule_id));

  -- Pausing a schedule leaves queued work durable but makes it unclaimable.
  v_owner_id := gen_random_uuid();
  INSERT INTO public.workflow_schedules (user_id, workflow_key, planning_mode, enabled, next_run_at, revision)
  VALUES (v_owner_id, 'hotlist_email', 'manual_backlog', false, now() - interval '1 minute', 1)
  RETURNING id INTO v_schedule_id;
  INSERT INTO public.workflow_jobs (schedule_id, user_id, workflow_key, planning_mode, scheduled_for)
  VALUES (v_schedule_id, v_owner_id, 'hotlist_email', 'manual_backlog', now() - interval '1 minute')
  RETURNING id INTO v_job_id;

  SELECT * INTO v_claimed_job FROM public.claim_workflow_jobs(100, 300) AS claimed WHERE claimed.id = v_job_id;
  INSERT INTO scheduler_observations (observation_key, text_value)
  SELECT 'paused_job_status', job.status FROM public.workflow_jobs AS job WHERE job.id = v_job_id;

  UPDATE public.workflow_schedules AS schedule SET enabled = true WHERE schedule.id = v_schedule_id;
  SELECT * INTO v_claimed_job FROM public.claim_workflow_jobs(100, 300) AS claimed WHERE claimed.id = v_job_id;
  INSERT INTO scheduler_observations (observation_key, bool_value)
  VALUES ('resumed_job_claimed', v_claimed_job.status = 'running' AND v_claimed_job.lease_token IS NOT NULL);

  -- Worker failures use one-minute then five-minute backoff, and attempt 3 is
  -- terminal. The third lease token is retained to prove stale resolution.
  v_owner_id := gen_random_uuid();
  INSERT INTO public.workflow_schedules (user_id, workflow_key, planning_mode, enabled, next_run_at, revision)
  VALUES (v_owner_id, 'sprint_planner', 'manual_backlog', true, now() - interval '1 minute', 1)
  RETURNING id INTO v_schedule_id;
  INSERT INTO public.workflow_jobs (schedule_id, user_id, workflow_key, planning_mode, scheduled_for)
  VALUES (v_schedule_id, v_owner_id, 'sprint_planner', 'manual_backlog', now() - interval '1 minute')
  RETURNING id INTO v_job_id;

  FOR v_attempt IN 1..3 LOOP
    IF v_attempt > 1 THEN
      UPDATE public.workflow_jobs AS job
      SET status = 'queued', retry_at = now() - interval '1 second', lease_until = NULL, lease_token = NULL
      WHERE job.id = v_job_id;
    END IF;

    SELECT * INTO v_claimed_job FROM public.claim_workflow_jobs(100, 300) AS claimed WHERE claimed.id = v_job_id;
    v_lease_token := v_claimed_job.lease_token;
    SELECT * INTO v_resolution
    FROM public.resolve_workflow_failure(v_job_id, v_lease_token, format('failure attempt %s', v_attempt));
    INSERT INTO scheduler_observations (observation_key, text_value, bool_value, timestamp_value)
    VALUES (
      format('retry_%s_status', v_attempt),
      v_resolution.status,
      v_attempt < 3 AND v_resolution.retry_at IS NOT NULL,
      v_resolution.retry_at
    );
  END LOOP;

  SELECT * INTO v_resolution
  FROM public.resolve_workflow_failure(v_job_id, v_lease_token, 'stale failure');
  INSERT INTO scheduler_observations (observation_key, text_value)
  VALUES ('retry_stale_status', v_resolution.status);

  -- Recovery clears the expired lease token. The old worker cannot complete
  -- the recovered job afterward.
  v_owner_id := gen_random_uuid();
  INSERT INTO public.workflow_schedules (user_id, workflow_key, planning_mode, enabled, next_run_at, revision)
  VALUES (v_owner_id, 'hotlist_email', 'manual_backlog', true, now() - interval '1 minute', 1)
  RETURNING id INTO v_schedule_id;
  INSERT INTO public.workflow_jobs (schedule_id, user_id, workflow_key, planning_mode, scheduled_for)
  VALUES (v_schedule_id, v_owner_id, 'hotlist_email', 'manual_backlog', now() - interval '1 minute')
  RETURNING id INTO v_job_id;
  SELECT * INTO v_claimed_job FROM public.claim_workflow_jobs(100, 300) AS claimed WHERE claimed.id = v_job_id;
  v_lease_token := v_claimed_job.lease_token;
  UPDATE public.workflow_jobs AS job SET lease_until = now() - interval '1 second' WHERE job.id = v_job_id;
  PERFORM public.recover_workflow_leases();
  SELECT * INTO v_claimed_job FROM public.workflow_jobs AS job WHERE job.id = v_job_id;
  INSERT INTO scheduler_observations (observation_key, bool_value)
  VALUES ('recovery_invalidates_lease', v_claimed_job.status = 'queued' AND v_claimed_job.lease_token IS NULL);
  SELECT public.complete_workflow_job_with_result(v_job_id, v_lease_token, 'sprint', gen_random_uuid()) INTO v_completed;
  INSERT INTO scheduler_observations (observation_key, bool_value)
  VALUES ('expired_worker_is_stale', NOT v_completed);

  -- Cancellation fences a running worker before it can persist a result.
  v_owner_id := gen_random_uuid();
  INSERT INTO public.workflow_schedules (user_id, workflow_key, planning_mode, enabled, next_run_at, revision)
  VALUES (v_owner_id, 'sprint_planner', 'manual_backlog', true, now() - interval '1 minute', 1)
  RETURNING id INTO v_schedule_id;
  INSERT INTO public.workflow_jobs (schedule_id, user_id, workflow_key, planning_mode, scheduled_for)
  VALUES (v_schedule_id, v_owner_id, 'sprint_planner', 'manual_backlog', now() - interval '1 minute')
  RETURNING id INTO v_job_id;
  SELECT * INTO v_claimed_job FROM public.claim_workflow_jobs(100, 300) AS claimed WHERE claimed.id = v_job_id;
  v_lease_token := v_claimed_job.lease_token;
  SELECT public.cancel_workflow_job(v_job_id, v_owner_id) INTO v_completed;
  INSERT INTO scheduler_observations (observation_key, bool_value)
  VALUES ('cancel_running_job', v_completed);
  SELECT public.complete_workflow_job_with_result(v_job_id, v_lease_token, 'sprint', gen_random_uuid()) INTO v_completed;
  INSERT INTO scheduler_observations (observation_key, bool_value)
  VALUES ('cancelled_worker_is_stale', NOT v_completed);

  -- Completion inserts the generic result pointer and terminal job receipt in
  -- one transaction.
  v_owner_id := gen_random_uuid();
  INSERT INTO public.workflow_schedules (user_id, workflow_key, planning_mode, enabled, next_run_at, revision)
  VALUES (v_owner_id, 'sprint_planner', 'manual_backlog', true, now() - interval '1 minute', 1)
  RETURNING id INTO v_schedule_id;
  INSERT INTO public.workflow_jobs (schedule_id, user_id, workflow_key, planning_mode, scheduled_for)
  VALUES (v_schedule_id, v_owner_id, 'sprint_planner', 'manual_backlog', now() - interval '1 minute')
  RETURNING id INTO v_job_id;
  SELECT * INTO v_claimed_job FROM public.claim_workflow_jobs(100, 300) AS claimed WHERE claimed.id = v_job_id;
  v_result_id := gen_random_uuid();
  SELECT public.complete_workflow_job_with_result(v_job_id, v_claimed_job.lease_token, 'sprint', v_result_id) INTO v_completed;
  INSERT INTO scheduler_observations (observation_key, bool_value, int_value)
  VALUES (
    'atomic_completion',
    v_completed AND (SELECT job.status = 'completed' FROM public.workflow_jobs AS job WHERE job.id = v_job_id),
    (SELECT count(*)::INTEGER FROM public.workflow_results AS result WHERE result.job_id = v_job_id)
  );

  -- One-off events are owner-scoped, replay-safe and claimable without a
  -- recurring schedule. Reusing an event key with a changed payload is not a
  -- valid retry.
  v_owner_id := gen_random_uuid();
  v_event_at := now() - interval '1 minute';
  SELECT id INTO v_event_job_id
  FROM public.enqueue_workflow_event(
    v_owner_id,
    'sprint_planner',
    'property:example:revision:2',
    '{"planningMode":"property_shortlist","source":"property_scan"}'::jsonb,
    1,
    v_event_at
  ) AS event_job;
  SELECT id INTO v_replayed_event_job_id
  FROM public.enqueue_workflow_event(
    v_owner_id,
    'sprint_planner',
    'property:example:revision:2',
    '{"planningMode":"property_shortlist","source":"property_scan"}'::jsonb,
    1,
    v_event_at
  ) AS event_job;
  v_event_replay_ok := v_event_job_id = v_replayed_event_job_id
    AND (SELECT count(*) = 1 FROM public.workflow_jobs WHERE id = v_event_job_id);
  INSERT INTO scheduler_observations (observation_key, bool_value)
  VALUES ('event_replay_same_job', v_event_replay_ok);

  BEGIN
    PERFORM public.enqueue_workflow_event(
      v_owner_id,
      'sprint_planner',
      'property:example:revision:2',
      '{"planningMode":"manual_backlog","source":"owner_request"}'::jsonb,
      1,
      v_event_at
    );
  EXCEPTION WHEN OTHERS THEN
    v_event_changed_rejected := SQLERRM = 'Workflow event key already exists with a different payload';
  END;
  INSERT INTO scheduler_observations (observation_key, bool_value)
  VALUES ('event_changed_payload_rejected', v_event_changed_rejected);

  SELECT * INTO v_event_claimed
  FROM public.claim_workflow_jobs(100, 300) AS claimed
  WHERE claimed.id = v_event_job_id;
  INSERT INTO scheduler_observations (observation_key, bool_value)
  VALUES (
    'event_claimed_without_schedule',
    v_event_claimed.status = 'running'
      AND v_event_claimed.trigger_kind = 'event'
      AND v_event_claimed.schedule_id IS NULL
      AND v_event_claimed.payload->>'source' = 'property_scan'
  );
END;
$$;

SELECT is((SELECT int_value FROM scheduler_observations WHERE observation_key = 'dispatch_inserted'), 1, 'dispatch inserts one current occurrence');
SELECT is((SELECT int_value FROM scheduler_observations WHERE observation_key = 'dispatch_duplicate_job_count'), 1, 'duplicate dispatch does not create another job');
SELECT is((SELECT text_value FROM scheduler_observations WHERE observation_key = 'paused_job_status'), 'queued', 'paused schedules keep queued jobs');
SELECT ok((SELECT bool_value FROM scheduler_observations WHERE observation_key = 'resumed_job_claimed'), 'resuming permits a new claim');
SELECT is((SELECT text_value FROM scheduler_observations WHERE observation_key = 'retry_1_status'), 'retry_queued', 'first failure is requeued');
SELECT ok((SELECT bool_value FROM scheduler_observations WHERE observation_key = 'retry_1_status'), 'first failure receives retry timing');
SELECT is((SELECT text_value FROM scheduler_observations WHERE observation_key = 'retry_2_status'), 'retry_queued', 'second failure is requeued');
SELECT is((SELECT text_value FROM scheduler_observations WHERE observation_key = 'retry_3_status'), 'failed', 'third failure is terminal');
SELECT is((SELECT text_value FROM scheduler_observations WHERE observation_key = 'retry_stale_status'), 'stale', 'old failure token is fenced');
SELECT ok((SELECT bool_value FROM scheduler_observations WHERE observation_key = 'recovery_invalidates_lease'), 'lease recovery clears the old token');
SELECT ok((SELECT bool_value FROM scheduler_observations WHERE observation_key = 'expired_worker_is_stale'), 'expired worker cannot complete recovered work');
SELECT ok((SELECT bool_value FROM scheduler_observations WHERE observation_key = 'cancel_running_job'), 'owner cancellation fences running work');
SELECT ok((SELECT bool_value FROM scheduler_observations WHERE observation_key = 'cancelled_worker_is_stale'), 'cancelled worker cannot write a result');
SELECT ok((SELECT bool_value FROM scheduler_observations WHERE observation_key = 'atomic_completion'), 'completion atomically closes the job');
SELECT is((SELECT int_value FROM scheduler_observations WHERE observation_key = 'atomic_completion'), 1, 'completion writes one generic result pointer');
SELECT ok((SELECT bool_value FROM scheduler_observations WHERE observation_key = 'schedule_paused_update'), 'schedule updates preserve paused state and advance revision');
SELECT is((SELECT int_value FROM scheduler_observations WHERE observation_key = 'schedule_paused_update'), 2, 'schedule update advances revision once');
SELECT ok((SELECT bool_value FROM scheduler_observations WHERE observation_key = 'schedule_stale_rejected'), 'stale schedule edits are rejected');
SELECT ok((SELECT bool_value FROM scheduler_observations WHERE observation_key = 'event_replay_same_job'), 'event replay returns the original job');
SELECT ok((SELECT bool_value FROM scheduler_observations WHERE observation_key = 'event_changed_payload_rejected'), 'event key payload changes are rejected');
SELECT ok((SELECT bool_value FROM scheduler_observations WHERE observation_key = 'event_claimed_without_schedule'), 'event jobs claim without a recurring schedule');

SELECT * FROM finish();
ROLLBACK;
